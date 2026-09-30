-- Dedicated ProjectHub database. Apply once as the workspace_v1 migration.
-- Public RPC is a narrow invoker wrapper; all tables and privileged code are private.
create schema if not exists projecthub_private;
revoke all on schema projecthub_private from public, anon, authenticated;
grant usage on schema projecthub_private to authenticated;

create table projecthub_private.workspaces (
  id uuid primary key,
  document jsonb not null,
  revision integer not null default 1 check (revision > 0),
  created_by uuid not null references auth.users(id),
  recovery_hash text not null check (recovery_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (octet_length(document::text) <= 1900000),
  check (document ?& array['id','name','mode','objective','deadline','projects','updatedAt']),
  check (jsonb_typeof(document->'id') = 'string' and jsonb_typeof(document->'name') = 'string'),
  check (document->>'id' = id::text),
  check (length(document->>'name') between 1 and 120),
  check (document->>'mode' in ('planned', 'rapid', 'crisis')),
  check (jsonb_typeof(document->'projects') = 'array' and jsonb_array_length(document->'projects') <= 50)
);
create table projecthub_private.members (
  workspace_id uuid not null references projecthub_private.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner','editor','viewer')),
  label text not null check (length(label) between 1 and 80),
  primary key (workspace_id, user_id)
);
create index members_user_id on projecthub_private.members(user_id);
create table projecthub_private.invitations (
  id uuid primary key,
  workspace_id uuid not null references projecthub_private.workspaces(id) on delete cascade,
  role text not null check (role in ('editor','viewer')),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null default now() + interval '7 days',
  claimed boolean not null default false,
  revoked boolean not null default false
);
create index invitations_workspace_id on projecthub_private.invitations(workspace_id);
create table projecthub_private.audit (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references projecthub_private.workspaces(id) on delete cascade,
  actor uuid not null references auth.users(id),
  action text not null,
  revision integer not null,
  happened_at timestamptz not null default now()
);
create index audit_workspace_time on projecthub_private.audit(workspace_id, happened_at desc);
create index workspaces_creator on projecthub_private.workspaces(created_by);

alter table projecthub_private.workspaces enable row level security;
alter table projecthub_private.members enable row level security;
alter table projecthub_private.invitations enable row level security;
alter table projecthub_private.audit enable row level security;
revoke all on all tables in schema projecthub_private from public, anon, authenticated;
revoke all on all sequences in schema projecthub_private from public, anon, authenticated;

-- Deny direct table access. This function is the sole authorized access path, including
-- for authenticated guests. Role comes from membership rows, never JWT user_metadata.
create function projecthub_private.workspace_call(p_action text, p_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  access_role text;
  current_row projecthub_private.workspaces;
  invitation projecthub_private.invitations;
  result jsonb;
  label_value text := trim(p_payload->>'label');
begin
  if actor is null then raise exception 'workspace_unauthorized' using errcode = '42501'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'workspace_invalid' using errcode = '22023';
  end if;

  if p_action = 'list' then
    select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'name', w.document->>'name',
      'role', m.role, 'updatedAt', w.updated_at) order by w.updated_at desc), '[]'::jsonb)
    into result from projecthub_private.workspaces w join projecthub_private.members m
      on m.workspace_id = w.id where m.user_id = actor;
    return result;
  end if;

  if p_action = 'create' then
    -- Serialize quota checks across creators so parallel calls cannot bypass the cap.
    perform pg_advisory_xact_lock(728416);
    if (select count(*) from projecthub_private.workspaces) >= 200
      or (select count(*) from projecthub_private.workspaces where created_by = actor) >= 10
      or (select count(*) from projecthub_private.workspaces where created_at > now() - interval '1 hour') >= 100 then
      raise exception 'workspace_limit' using errcode = '54000';
    end if;
    if label_value is null or length(label_value) not between 1 and 80
      or p_payload->>'recoveryHash' is null or (p_payload->>'recoveryHash') !~ '^[a-f0-9]{64}$'
      or p_payload->'document' is null then raise exception 'workspace_invalid' using errcode = '22023'; end if;
    insert into projecthub_private.workspaces(id, document, created_by, recovery_hash)
      values (p_id, p_payload->'document', actor, p_payload->>'recoveryHash');
    insert into projecthub_private.members values (p_id, actor, 'owner', label_value);
    insert into projecthub_private.audit(workspace_id,actor,action,revision) values (p_id,actor,'created',1);
  elsif p_action = 'join' then
    if label_value is null or length(label_value) not between 1 and 80
      or coalesce(p_payload->>'tokenHash','') !~ '^[a-f0-9]{64}$' then
      raise exception 'workspace_invalid' using errcode = '22023';
    end if;
    select * into current_row from projecthub_private.workspaces where id = p_id for update;
    if not found then raise exception 'workspace_forbidden' using errcode = '42501'; end if;
    if (select count(*) from projecthub_private.members where user_id = actor) >= 30
      or (select count(*) from projecthub_private.members where workspace_id = p_id) >= 50 then
      raise exception 'workspace_limit' using errcode = '54000';
    end if;
    if current_row.recovery_hash = p_payload->>'tokenHash' then
      access_role := 'owner';
    else
      select * into invitation from projecthub_private.invitations where workspace_id = p_id
        and token_hash = p_payload->>'tokenHash' and not claimed and not revoked and expires_at > now()
        for update;
      if not found then raise exception 'workspace_forbidden' using errcode = '42501'; end if;
      access_role := invitation.role;
      update projecthub_private.invitations set claimed = true where id = invitation.id;
    end if;
    insert into projecthub_private.members values (p_id, actor, access_role, label_value)
      on conflict (workspace_id,user_id) do update set label = excluded.label,
        role = case when projecthub_private.members.role = 'owner' then 'owner'
          when excluded.role = 'owner' then 'owner'
          when projecthub_private.members.role = 'editor' then 'editor' else excluded.role end;
    insert into projecthub_private.audit(workspace_id,actor,action,revision)
      values (p_id,actor,'joined',current_row.revision);
  end if;

  -- Hold the event lock through authorization and mutations, including revocations.
  select * into current_row from projecthub_private.workspaces where id = p_id for update;
  select role into access_role from projecthub_private.members where workspace_id = p_id and user_id = actor;
  if access_role is null or current_row.id is null then
    raise exception 'workspace_forbidden' using errcode = '42501';
  end if;

  if p_action = 'save' then
    if access_role not in ('owner','editor') then raise exception 'workspace_forbidden' using errcode = '42501'; end if;
    if (p_payload->>'revision')::integer is distinct from current_row.revision then
      raise exception 'workspace_conflict' using errcode = '40001';
    end if;
    if (select count(*) from projecthub_private.audit where workspace_id = p_id
      and happened_at > now() - interval '1 minute' and action = 'saved') >= 120 then
      raise exception 'workspace_limit' using errcode = '54000';
    end if;
    update projecthub_private.workspaces set document = p_payload->'document', revision = revision + 1,
      updated_at = now() where id = p_id returning * into current_row;
    insert into projecthub_private.audit(workspace_id,actor,action,revision)
      values (p_id,actor,'saved',current_row.revision);
  elsif p_action in ('invite','revoke_invite','remove_member','recovery') then
    if access_role <> 'owner' then raise exception 'workspace_forbidden' using errcode = '42501'; end if;
    if p_action = 'invite' then
      delete from projecthub_private.invitations where workspace_id = p_id
        and (revoked or claimed or expires_at <= now());
      if (select count(*) from projecthub_private.invitations where workspace_id = p_id
        and not revoked and not claimed and expires_at > now()) >= 20 then
        raise exception 'workspace_limit' using errcode = '54000';
      end if;
      insert into projecthub_private.invitations(id,workspace_id,role,token_hash)
        values ((p_payload->>'id')::uuid,p_id,p_payload->>'role',p_payload->>'tokenHash');
    elsif p_action = 'revoke_invite' then
      update projecthub_private.invitations set revoked = true where id = (p_payload->>'id')::uuid and workspace_id = p_id;
    elsif p_action = 'remove_member' then
      if (p_payload->>'userId')::uuid = actor then raise exception 'workspace_invalid' using errcode = '22023'; end if;
      delete from projecthub_private.members where workspace_id = p_id and user_id = (p_payload->>'userId')::uuid;
    else
      update projecthub_private.workspaces set recovery_hash = p_payload->>'tokenHash' where id = p_id;
    end if;
    insert into projecthub_private.audit(workspace_id,actor,action,revision)
      values (p_id,actor,p_action,current_row.revision);
  elsif p_action not in ('read','create','join','save') then
    raise exception 'workspace_invalid' using errcode = '22023';
  end if;

  -- Keep only the latest 200 audit entries; no document content or invite tokens in logs.
  delete from projecthub_private.audit where workspace_id = p_id and id in
    (select id from projecthub_private.audit where workspace_id = p_id order by id desc offset 200);
  return jsonb_build_object('workspace',current_row.document,'revision',current_row.revision,
    'role',access_role,'userId',actor,'updatedAt',current_row.updated_at,
    'members', case when access_role = 'owner' then (select coalesce(jsonb_agg(jsonb_build_object(
      'userId',user_id,'label',label,'role',role) order by label),'[]'::jsonb)
      from projecthub_private.members where workspace_id = p_id) else '[]'::jsonb end,
    'invitations', case when access_role = 'owner' then (select coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'role',role,'expiresAt',expires_at) order by expires_at),'[]'::jsonb)
      from projecthub_private.invitations where workspace_id = p_id and not claimed and not revoked and expires_at > now()) else '[]'::jsonb end,
    'activity',(select coalesce(jsonb_agg(row_to_json(a)),'[]'::jsonb) from
      (select action,revision,happened_at as "at" from projecthub_private.audit where workspace_id = p_id order by id desc limit 20) a));
end;
$$;
revoke all on function projecthub_private.workspace_call(text,uuid,jsonb) from public, anon;
grant execute on function projecthub_private.workspace_call(text,uuid,jsonb) to authenticated;

create function public.workspace_call(p_action text, p_id uuid default null, p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select projecthub_private.workspace_call(p_action,p_id,p_payload);
$$;
revoke all on function public.workspace_call(text,uuid,jsonb) from public, anon;
grant execute on function public.workspace_call(text,uuid,jsonb) to authenticated;
