import { NextResponse } from "next/server";

// The public-API envelope. Every /api/v1 response is this shape so an external
// consumer parses ONE contract (mirrors ApiResponse<T> in
// .claude/rules/typescript/patterns.md): success flag, nullable data, nullable error,
// optional meta. The read side is open + cacheable; writes stay server actions.

export interface ApiMeta {
  count?: number;
  query?: string;
  [k: string]: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: ApiMeta;
}

// Open read-only API: any origin may GET. No cookies / credentials are involved, so a
// wildcard origin is safe — there is no per-user state to leak.
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Catalog endpoints: edge-cacheable. Fresh 5 min, then serve stale up to 10 min while
// revalidating in the background. The CDN cache is what shields the origin from load.
export const CACHE_CATALOG = "public, s-maxage=300, stale-while-revalidate=600";
// Volatile endpoints (votes, stats): never cache — always reflect the latest count.
export const CACHE_NO_STORE = "no-store";

function envelope<T>(
  body: ApiResponse<T>,
  status: number,
  cache: string,
  extra?: Record<string, string>,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { ...CORS_HEADERS, "Cache-Control": cache, ...extra },
  });
}

// 200 OK with a data payload. Defaults to the catalog cache; pass `cache` to override
// (e.g. CACHE_NO_STORE for live data) and `meta`/`headers` for extras.
export function ok<T>(
  data: T,
  opts?: { meta?: ApiMeta; cache?: string; headers?: Record<string, string> },
): NextResponse {
  return envelope<T>(
    { success: true, data, error: null, meta: opts?.meta },
    200,
    opts?.cache ?? CACHE_CATALOG,
    opts?.headers,
  );
}

// Error response with a status (default 400). data is null and the body is never cached
// so a transient failure can't be served from the edge.
export function fail(error: string, status = 400, extra?: Record<string, string>): NextResponse {
  return envelope({ success: false, data: null, error }, status, CACHE_NO_STORE, extra);
}

// CORS preflight (OPTIONS). 204, no body, same open headers.
export function preflight(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "Cache-Control": CACHE_NO_STORE },
  });
}
