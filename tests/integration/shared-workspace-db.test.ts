import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const db = new PGlite();
const owner = randomUUID(), editor = randomUUID(), viewer = randomUUID(), outsider = randomUUID();
const eventId = randomUUID(), otherId = randomUUID();
const recoveryHash = "a".repeat(64), editorHash = "b".repeat(64), viewerHash = "c".repeat(64);
const document = (id: string, name = "Test event") => ({ id, name, mode: "rapid", objective: "", deadline: "", projects: [], updatedAt: new Date().toISOString() });

async function asUser(user: string | null, action: string, id: string | null = eventId, payload: unknown = {}) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""]);
  await db.exec("set role authenticated");
  const result = await db.query<{ result: Record<string, unknown> }>("select public.workspace_call($1,$2,$3::jsonb) as result", [action, id, JSON.stringify(payload)]);
  return result.rows[0].result;
}

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema public,auth to authenticated;
    grant execute on function auth.uid() to authenticated;`);
  for (const id of [owner, editor, viewer, outsider]) await db.query("insert into auth.users values ($1)", [id]);
  await db.exec(await readFile("database/workspaces.sql", "utf8"));
}, 30_000);
afterAll(async () => { await db.close(); });

describe.sequential("actual PostgreSQL workspace access contract", () => {
  it("requires an authenticated identity, creates owner membership and isolates lists", async () => {
    await expect(asUser(null, "list", null)).rejects.toThrow("workspace_unauthorized");
    const created = await asUser(owner, "create", eventId, { document: document(eventId), recoveryHash, label: "Owner" });
    expect(created.role).toBe("owner");
    expect(created.revision).toBe(1);
    expect(JSON.stringify(created)).not.toContain(recoveryHash);
    expect(await asUser(outsider, "list", null)).toEqual([]);
    await expect(asUser(outsider, "read")).rejects.toThrow("workspace_forbidden");
    await expect(db.query("select * from projecthub_private.workspaces")).rejects.toThrow("permission denied");
    await db.exec("reset role; set role anon");
    await expect(db.query("select public.workspace_call('list')")).rejects.toThrow("permission denied");
  });
  it("scopes invitations, permits one redemption, and never exposes hashes", async () => {
    await asUser(owner, "create", otherId, { document: document(otherId, "Separate event"), recoveryHash, label: "Owner" });
    await asUser(owner, "invite", eventId, { id: randomUUID(), role: "editor", tokenHash: editorHash });
    await expect(asUser(editor, "join", otherId, { label: "Editor", tokenHash: editorHash })).rejects.toThrow("workspace_forbidden");
    const joined = await asUser(editor, "join", eventId, { label: "Editor", tokenHash: editorHash });
    expect(joined.role).toBe("editor");
    expect(joined.members).toEqual([]);
    await expect(asUser(outsider, "join", eventId, { label: "Late", tokenHash: editorHash })).rejects.toThrow("workspace_forbidden");
    await expect(asUser(editor, "invite", eventId, { id: randomUUID(), role: "viewer", tokenHash: viewerHash })).rejects.toThrow("workspace_forbidden");
  });
  it("allows editor changes and atomically rejects stale saves", async () => {
    const saved = await asUser(editor, "save", eventId, { revision: 1, document: document(eventId, "Updated by editor") });
    expect(saved.revision).toBe(2);
    await expect(asUser(owner, "save", eventId, { revision: 1, document: document(eventId, "Stale") })).rejects.toThrow("workspace_conflict");
    expect((await asUser(owner, "read")).workspace).toMatchObject({ name: "Updated by editor" });
    await expect(asUser(editor, "save", eventId, { revision: 2, document: document(otherId) })).rejects.toThrow();
  });
  it("enforces viewer rights at the database even if the UI is bypassed", async () => {
    await asUser(owner, "invite", eventId, { id: randomUUID(), role: "viewer", tokenHash: viewerHash });
    expect((await asUser(viewer, "join", eventId, { label: "Viewer", tokenHash: viewerHash })).role).toBe("viewer");
    expect((await asUser(viewer, "read")).revision).toBe(2);
    await expect(asUser(viewer, "save", eventId, { revision: 2, document: document(eventId) })).rejects.toThrow("workspace_forbidden");
    await expect(asUser(viewer, "remove_member", eventId, { userId: owner })).rejects.toThrow("workspace_forbidden");
  });
  it("revokes memberships and invitations without affecting a different event", async () => {
    await asUser(owner, "remove_member", eventId, { userId: editor });
    await expect(asUser(editor, "read")).rejects.toThrow("workspace_forbidden");
    const inviteId = randomUUID();
    await asUser(owner, "invite", eventId, { id: inviteId, role: "editor", tokenHash: "d".repeat(64) });
    await asUser(owner, "revoke_invite", otherId, { id: inviteId });
    expect((await asUser(owner, "read")).invitations).toHaveLength(1);
    await asUser(owner, "revoke_invite", eventId, { id: inviteId });
    await expect(asUser(editor, "join", eventId, { label: "Editor", tokenHash: "d".repeat(64) })).rejects.toThrow("workspace_forbidden");
    await expect(asUser(owner, "remove_member", eventId, { userId: owner })).rejects.toThrow("workspace_invalid");
  });
  it("supports owner recovery and invalidates the replaced recovery link", async () => {
    expect((await asUser(outsider, "join", eventId, { label: "Owner second device", tokenHash: recoveryHash })).role).toBe("owner");
    await asUser(owner, "recovery", eventId, { tokenHash: "e".repeat(64) });
    await expect(asUser(editor, "join", eventId, { label: "Old recovery", tokenHash: recoveryHash })).rejects.toThrow("workspace_forbidden");
    await asUser(owner, "remove_member", eventId, { userId: outsider });
    await expect(asUser(outsider, "read")).rejects.toThrow("workspace_forbidden");
  });
});
