// fetch with bounded exponential backoff, honoring Retry-After on 429 / 5xx. Keeps
// any Next ISR cache opts (next: { revalidate }) the caller passes, so a transient
// hiccup retries instead of blanking the roster. Throws only after exhausting retries
// so the caller's own fallback (committed JSON) can take over.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RetryOpts {
  maxRetries?: number;
  baseDelayMs?: number;
}

type FetchInit = RequestInit & { next?: { revalidate?: number } };

export async function fetchWithRetry(
  url: string,
  init: FetchInit = {},
  { maxRetries = 3, baseDelayMs = 500 }: RetryOpts = {},
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      // Retry only transient statuses; return others so the caller decides.
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : baseDelayMs * 2 ** attempt;
        console.warn(
          `[fetch] ${url} → ${res.status}, retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})`,
        );
        await sleep(Math.min(waitMs, 30000));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt >= maxRetries) break;
      const waitMs = baseDelayMs * 2 ** attempt;
      console.warn(`[fetch] ${url} threw, retrying in ${Math.round(waitMs / 1000)}s:`, err);
      await sleep(waitMs);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`fetch failed after retries: ${url}`);
}
