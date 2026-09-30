import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export function sharedConfigured() {
  return Boolean(process.env.WORKSPACE_SUPABASE_URL && process.env.WORKSPACE_SUPABASE_PUBLISHABLE_KEY);
}

// A new client per request prevents sessions crossing requests in warm serverless workers.
// All Auth calls are server-side; browser JavaScript never needs the session tokens.
export async function sharedClient() {
  const jar = await cookies();
  return createServerClient(process.env.WORKSPACE_SUPABASE_URL!, process.env.WORKSPACE_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: { getAll: () => jar.getAll(), setAll: (items) => items.forEach(({ name, value, options }) => jar.set(name, value, options)) },
  });
}

export const privateHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Robots-Tag": "noindex" };
export function sharedResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: privateHeaders });
}
export function sharedFailure(error: { code?: string; message?: string }) {
  const status = error.code === "40001" ? 409 : error.code === "42501" ? 403 : error.code === "54000" ? 429 : error.code?.startsWith("22") || error.code?.startsWith("23") ? 400 : 503;
  return sharedResponse({ error: status === 409 ? "conflict" : status === 403 ? "access" : status === 429 ? "limit" : status === 400 ? "invalid" : "unavailable" }, status);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Compare against the actual URL, never a caller-provided forwarded host.
  return origin === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site";
}

export async function readSharedBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("invalid");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) { await reader.cancel(); throw new Error("invalid"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
