// Minimal Upstash Redis REST client — fetch-based (no persistent socket), so it is
// safe on Vercel's serverless/edge runtime where votes.json can't be written.
// Enabled only when BOTH env vars are present. Every method fails soft: on any error
// it logs context and returns null so a render never throws on a cache miss — the
// caller falls back to the local JSON store. Secrets are read from env, never logged.
const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function call(pathname: string): Promise<unknown | null> {
  if (!URL || !TOKEN) return null;
  try {
    const res = await fetch(`${URL}/${pathname}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = (await res.json()) as { result?: unknown };
    return json.result ?? null;
  } catch (err) {
    console.error(`[redis] ${pathname.split("/")[0]} failed, falling back:`, err);
    return null;
  }
}

export const redis = {
  enabled: Boolean(URL && TOKEN),

  // INCR key → new integer count, or null on failure.
  async incr(key: string): Promise<number | null> {
    const r = await call(`incr/${encodeURIComponent(key)}`);
    return typeof r === "number" ? r : null;
  },

  // MGET keys → array of (string | null) in order, or null on failure.
  async mget(keys: string[]): Promise<(string | null)[] | null> {
    if (keys.length === 0) return null;
    const r = await call(`mget/${keys.map((k) => encodeURIComponent(k)).join("/")}`);
    return Array.isArray(r) ? (r as (string | null)[]) : null;
  },

  // RPUSH key value → new list length, or null on failure. Append-only growing list
  // (memberships, self-added builders); each element is one JSON-encoded record.
  async rpush(key: string, value: string): Promise<number | null> {
    const r = await call(`rpush/${encodeURIComponent(key)}/${encodeURIComponent(value)}`);
    return typeof r === "number" ? r : null;
  },

  // LRANGE key 0 -1 → every element (in insertion order) as strings, or null on failure.
  async lrange(key: string): Promise<string[] | null> {
    const r = await call(`lrange/${encodeURIComponent(key)}/0/-1`);
    return Array.isArray(r) ? (r as string[]) : null;
  },

  // SET key value → true on success ("OK"), false on failure. Single overwriting value
  // (e.g. a project's attached-repo override, read back via mget).
  async set(key: string, value: string): Promise<boolean> {
    const r = await call(`set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`);
    return r === "OK";
  },
};
