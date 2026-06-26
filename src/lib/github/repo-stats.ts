// Read-only GitHub stats for a repo URL. Used when a user attaches a repo to a
// project so the board can show its contributor count. GITHUB_TOKEN (optional) is
// read from env and only sent as an Authorization header — never logged. The API
// response is DATA: we read a count and the Link header, nothing else.

export function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.hostname !== "github.com" && u.hostname !== "www.github.com") return null;
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  if (!owner || !repo) return null;
  return { owner, repo };
}

// Contributor count without paging the whole list: request 1 per page and read the
// last-page number from the Link header (page count === contributor count). Returns
// null on any failure (caller treats a missing count as "unknown", never fatal).
export async function fetchRepoContributorCount(owner: string, repo: string): Promise<number | null> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "build4venezuela-projecthub",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributors?per_page=1&anon=true`,
      { headers, next: { revalidate: 3600 } },
    );
    if (!res.ok) {
      console.error(`[github] contributors ${owner}/${repo}: ${res.status} ${res.statusText}`);
      return null;
    }
    const link = res.headers.get("link");
    if (link) {
      const m = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
      if (m) return Number(m[1]);
    }
    // No Link header → 0 or 1 contributors; the body length is the count.
    const arr = await res.json();
    return Array.isArray(arr) ? arr.length : null;
  } catch (err) {
    console.error(`[github] contributor fetch failed ${owner}/${repo}:`, err);
    return null;
  }
}
