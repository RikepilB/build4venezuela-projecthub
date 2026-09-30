import { createHash, randomBytes } from "node:crypto";
import { CreateSharedSchema, SharedListSchema, SharedWorkspaceSchema } from "@/lib/workspace/shared-schema";
import { copyWorkspace } from "@/lib/workspace/domain";
import { readSharedBody, sameOrigin, sharedClient, sharedConfigured, sharedFailure, sharedResponse } from "@/lib/workspace/shared-server";

export async function GET() {
  if (!sharedConfigured()) return sharedResponse({ configured: false, workspaces: [] });
  try {
    const client = await sharedClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return sharedResponse({ configured: true, workspaces: [] });
    const { data, error } = await client.rpc("workspace_call", { p_action: "list" });
    if (error) return sharedFailure(error);
    return sharedResponse({ configured: true, workspaces: SharedListSchema.parse(data) });
  } catch { return sharedResponse({ error: "unavailable" }, 503); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return sharedResponse({ error: "access" }, 403);
  if (!sharedConfigured()) return sharedResponse({ error: "unavailable" }, 503);
  let input;
  try { input = CreateSharedSchema.parse(await readSharedBody(request)); }
  catch { return sharedResponse({ error: "invalid" }, 400); }
  try {
    const client = await sharedClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      const signed = await client.auth.signInAnonymously();
      if (signed.error) return sharedResponse({ error: signed.error.status === 429 ? "limit" : "unavailable" }, signed.error.status === 429 ? 429 : 503);
    }
    // Sharing creates an independent copy. Local work never becomes a silent cloud draft.
    const document = copyWorkspace(input.workspace, () => crypto.randomUUID(), new Date().toISOString());
    const recovery = randomBytes(32).toString("hex");
    const { data, error } = await client.rpc("workspace_call", { p_action: "create", p_id: document.id,
      p_payload: { document, label: input.label, recoveryHash: createHash("sha256").update(recovery).digest("hex") } });
    if (error) return sharedFailure(error);
    return sharedResponse({ data: SharedWorkspaceSchema.parse(data), recovery }, 201);
  } catch { return sharedResponse({ error: "unavailable" }, 503); }
}
