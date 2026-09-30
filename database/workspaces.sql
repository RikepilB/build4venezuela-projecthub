-- Dedicated ProjectHub database. Apply once as the workspace_v1 migration.
-- Public RPC is a narrow invoker wrapper; all tables and privileged code are private.
create schema if not exists projecthub_private;
revoke all on schema projecthub_private from public, anon, authenticated;
grant usage on schema projecthub_private to authenticated;

-- Direct authenticated RPC calls bypass the HTTP validator. Reject malformed nested
-- documents here too, before they can make subsequent WorkspaceSchema reads fail.
create function projecthub_private.valid_text(value jsonb, minimum integer, maximum integer)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(value) = 'string' and
    (select coalesce(sum(case when ascii(c) > 65535 then 2 else 1 end), 0)
      from regexp_split_to_table(btrim(value #>> '{}', E' \t\r\n\u000b\f\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'), '') c where c <> '')
      between minimum and maximum, false);
$$;

create function projecthub_private.valid_date(value jsonb, optional boolean)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(value) = 'string' and ((optional and value = '""'::jsonb) or
    value #>> '{}' ~ '^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|02-(?:0[1-9]|1\d|2[0-8])))T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$'), false);
$$;

create function projecthub_private.valid_link(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare parts text[]; host text;
begin
  if not projecthub_private.valid_text(value, 0, 2048) then return false; end if;
  if value = '""'::jsonb then return true; end if;
  -- Canonical HTTP(S) URLs with DNS, IPv4 or bracketed IPv6 hosts; no credentials.
  parts := regexp_match(value #>> '{}', '^https?://(\[[0-9a-fA-F:]+\]|[a-zA-Z0-9.-]+)(:([0-9]{1,5}))?([/?#][^[:space:]\\]*)?$');
  if parts is null or coalesce(parts[3]::integer, 0) > 65535 then return false; end if;
  host := parts[1];
  if host like '[%]' then perform trim(both '[]' from host)::inet;
  elsif host ~ '^[0-9.]+$' then perform host::inet;
  elsif host !~ '^([a-zA-Z0-9-]+\.)*[a-zA-Z][a-zA-Z0-9-]*\.?$' then return false;
  end if;
  return true;
exception when others then return false;
end;
$$;

create function projecthub_private.valid_workspace_node(value jsonb, kind text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare child jsonb;
begin
  if jsonb_typeof(value) is distinct from 'object' or
    jsonb_typeof(value->'id') is distinct from 'string' or
    coalesce(value->>'id','') !~ '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
    then return false; end if;
  if kind in ('workspace','project') then
    if not projecthub_private.valid_text(value->'name',1,120) then return false; end if;
  elsif not projecthub_private.valid_text(value->'title',1,120) then return false;
  end if;
  if kind = 'workspace' then
    if coalesce(value->>'mode','') not in ('planned','rapid','crisis') or
      not projecthub_private.valid_text(value->'objective',0,2000) or
      not projecthub_private.valid_date(value->'deadline',true) or
      not projecthub_private.valid_date(value->'updatedAt',false) or
      jsonb_typeof(value->'projects') is distinct from 'array' then return false; end if;
    if jsonb_array_length(value->'projects') > 50 then return false; end if;
    for child in select * from jsonb_array_elements(value->'projects') loop
      if not projecthub_private.valid_workspace_node(child,'project') then return false; end if;
    end loop;
  elsif kind = 'project' then
    if not projecthub_private.valid_text(value->'goal',0,2000) or
      not projecthub_private.valid_link(value->'repoUrl') or
      not projecthub_private.valid_link(value->'demoUrl') or
      not projecthub_private.valid_link(value->'submissionUrl') or
      jsonb_typeof(value->'tasks') is distinct from 'array' or
      jsonb_typeof(value->'deliverables') is distinct from 'array' then return false; end if;
    if jsonb_array_length(value->'tasks') > 200 or jsonb_array_length(value->'deliverables') > 30 then return false; end if;
    for child in select * from jsonb_array_elements(value->'tasks') loop
      if not projecthub_private.valid_workspace_node(child,'task') then return false; end if;
    end loop;
    for child in select * from jsonb_array_elements(value->'deliverables') loop
      if not projecthub_private.valid_workspace_node(child,'deliverable') then return false; end if;
    end loop;
  elsif kind = 'task' then
    if not projecthub_private.valid_text(value->'owner',0,80) or
      not projecthub_private.valid_text(value->'blocker',0,500) or
      not projecthub_private.valid_date(value->'dueAt',true) or
      coalesce(value->>'status','') not in ('todo','doing','blocked','done') or
      coalesce(value->>'priority','') not in ('high','normal','low') then return false; end if;
  elsif kind = 'deliverable' then
    if jsonb_typeof(value->'done') is distinct from 'boolean' then return false; end if;
  else return false;
  end if;
  return true;
end;
$$;

create function projecthub_private.valid_workspace(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if value is null or octet_length(value::text) > 1900000 or
    not projecthub_private.valid_workspace_node(value,'workspace') then return false; end if;
  return (with ids as (
    select value->>'id' as id union all
    select p->>'id' from jsonb_array_elements(value->'projects') p union all
    select t->>'id' from jsonb_array_elements(value->'projects') p, jsonb_array_elements(p->'tasks') t union all
    select d->>'id' from jsonb_array_elements(value->'projects') p, jsonb_array_elements(p->'deliverables') d
  ) select count(*) = count(distinct id) from ids);
end;
$$;
revoke all on all functions in schema projecthub_private from public, anon, authenticated;

create table projecthub_private.workspaces (
  id uuid primary key,
  document jsonb not null,
  revision integer not null default 1 check (revision > 0),
  created_by uuid not null references auth.users(id),
  recovery_hash text not null check (recovery_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (octet_length(document::text) <= 1900000),
  check (projecthub_private.valid_workspace(document)),
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

  -- Polling reads do not block saves. Mutations serialize through the event lock.
  if p_action = 'read' then
    select * into current_row from projecthub_private.workspaces where id = p_id;
  else
    select * into current_row from projecthub_private.workspaces where id = p_id for update;
  end if;
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
  if p_action <> 'read' then
    delete from projecthub_private.audit where workspace_id = p_id and id in
      (select id from projecthub_private.audit where workspace_id = p_id order by id desc offset 200);
  end if;
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
