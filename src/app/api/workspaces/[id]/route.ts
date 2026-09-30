import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { SharedMutationSchema, SharedWorkspaceSchema } from "@/lib/workspace/shared-schema";
import { readSharedBody, sameOrigin, sharedClient, sharedConfigured, sharedFailure, sharedResponse } from "@/lib/workspace/shared-server";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return sharedResponse({ error: "access" }, 404);
  if (!sharedConfigured()) return sharedResponse({ error: "unavailable" }, 503);
  try {
    const client = await sharedClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return sharedResponse({ error: "access" }, 401);
    const { data, error } = await client.rpc("workspace_call", { p_action: "read", p_id: id });
    if (error) return sharedFailure(error);
    return sharedResponse({ data: SharedWorkspaceSchema.parse(data) });
  } catch { return sharedResponse({ error: "unavailable" }, 503); }
}

export async function POST(request: Request, { params }: Context) {
  if (!sameOrigin(request)) return sharedResponse({ error: "access" }, 403);
  if (!sharedConfigured()) return sharedResponse({ error: "unavailable" }, 503);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return sharedResponse({ error: "access" }, 404);
  let input;
  try { input = SharedMutationSchema.parse(await readSharedBody(request)); }
  catch { return sharedResponse({ error: "invalid" }, 400); }
  if (input.action === "save" && input.document.id !== id) return sharedResponse({ error: "invalid" }, 400);
  try {
    const client = await sharedClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      if (input.action !== "join") return sharedResponse({ error: "access" }, 401);
      const signed = await client.auth.signInAnonymously();
      if (signed.error) return sharedResponse({ error: signed.error.status === 429 ? "limit" : "unavailable" }, signed.error.status === 429 ? 429 : 503);
    }
    let token: string | undefined;
    let payload: Record<string, unknown> = input;
    if (input.action === "join") payload = { label: input.label, tokenHash: createHash("sha256").update(input.token).digest("hex") };
    if (input.action === "invite" || input.action === "recovery") {
      token = randomBytes(32).toString("hex");
      payload = { ...input, id: crypto.randomUUID(), tokenHash: createHash("sha256").update(token).digest("hex") };
    }
    const { data, error } = await client.rpc("workspace_call", { p_action: input.action, p_id: id, p_payload: payload });
    if (error) return sharedFailure(error);
    return sharedResponse({ data: SharedWorkspaceSchema.parse(data), ...(token ? { token } : {}) });
  } catch { return sharedResponse({ error: "unavailable" }, 503); }
}
