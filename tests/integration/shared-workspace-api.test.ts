import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readSharedBody, sameOrigin } from "@/lib/workspace/shared-server";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), user: vi.fn(), signIn: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ rpc: mocks.rpc, auth: { getUser: mocks.user, signInAnonymously: mocks.signIn } }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
import { POST, GET } from "@/app/api/workspaces/[id]/route";

const id = randomUUID(), userId = randomUUID();
const context = { params: Promise.resolve({ id }) };
const document = { id, name: "Test", mode: "rapid", objective: "", deadline: "", projects: [], updatedAt: new Date().toISOString() };
const request = (body: unknown, origin = "https://example.test") => new Request(`https://example.test/api/workspaces/${id}`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.stubEnv("WORKSPACE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("WORKSPACE_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ data: { user: { id: userId } } });
});

describe("shared API boundary", () => {
  it("rejects missing/cross-site origins before touching auth or data", async () => {
    expect((await POST(request({ action: "recovery" }, "https://attacker.test"), context)).status).toBe(403);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(sameOrigin(new Request("https://example.test/api/workspaces"))).toBe(false);
    expect(sameOrigin(new Request("https://example.test/api/workspaces", { headers: { origin: "https://example.test", "sec-fetch-site": "cross-site" } }))).toBe(false);
  });
  it("bounds streamed JSON independently of a supplied content-length", async () => {
    await expect(readSharedBody(request({ data: "a".repeat(2_000_001) }))).rejects.toThrow("invalid");
    await expect(readSharedBody(new Request("https://example.test", { method: "POST", body: "{}" }))).rejects.toThrow("invalid");
  });
  it("validates workspace identity and safe URLs before calling the database", async () => {
    expect((await POST(request({ action: "save", revision: 1, document: { ...document, id: randomUUID() } }), context)).status).toBe(400);
    expect((await POST(request({ action: "invite", role: "owner" }), context)).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not create guest sessions for unauthorized reads or writes", async () => {
    mocks.user.mockResolvedValue({ data: { user: null } });
    expect((await POST(request({ action: "recovery" }), context)).status).toBe(401);
    expect((await GET(new Request(`https://example.test/api/workspaces/${id}`), context)).status).toBe(401);
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it("returns safe conflicts and never leaks database diagnostics", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "40001", message: "workspace_conflict: internal diagnostic" } });
    const response = await POST(request({ action: "save", revision: 1, document }), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "conflict" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
  });
  it("hashes invitation secrets before the database receives them", async () => {
    mocks.rpc.mockResolvedValue({ data: { workspace: document, revision: 1, role: "viewer", userId, updatedAt: new Date().toISOString(), members: [], invitations: [], activity: [] }, error: null });
    const token = "a".repeat(64);
    const response = await POST(request({ action: "join", label: "Participant", token }), context);
    expect(response.status).toBe(200);
    const payload = mocks.rpc.mock.calls[0][1].p_payload;
    expect(payload.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.tokenHash).not.toBe(token);
    expect(payload).not.toHaveProperty("token");
    expect(JSON.stringify(await response.json())).not.toContain(token);
  });
});
