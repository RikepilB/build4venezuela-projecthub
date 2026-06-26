"use client";

import { useState } from "react";

// A lightweight "website image" for an existing project: the site's favicon over a
// token-tinted gradient, with a category-glyph fallback if the favicon doesn't load.
// Favicon via DuckDuckGo's icon service (no tracking cookies). Hostname shown as a
// label so the tile reads as a real site. Tokens-only classes — no hardcoded colors.
const META: Record<string, { icon: string; tint: string }> = {
  "missing-persons": { icon: "🔎", tint: "from-danger/20" },
  shelter: { icon: "🏠", tint: "from-success/20" },
  "aid-center": { icon: "📦", tint: "from-success/20" },
  "needs-map": { icon: "🗺️", tint: "from-accent/20" },
  medical: { icon: "➕", tint: "from-danger/20" },
  transport: { icon: "🚐", tint: "from-accent/20" },
  translation: { icon: "🌐", tint: "from-accent/20" },
  coordination: { icon: "🧭", tint: "from-primary/20" },
  tracking: { icon: "📍", tint: "from-primary/20" },
};
const FALLBACK = { icon: "🌐", tint: "from-accent/20" };

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function SiteThumb({ url, category }: { url: string; category?: string }) {
  const [failed, setFailed] = useState(false);
  const { icon, tint } = (category && META[category]) || FALLBACK;
  const host = hostnameOf(url);
  const favicon = host ? `https://icons.duckduckgo.com/ip3/${host}.ico` : "";

  return (
    <div
      className={`relative flex h-28 items-center justify-center overflow-hidden bg-linear-to-br ${tint} to-surface-2`}
    >
      <span className="absolute text-5xl opacity-20" aria-hidden>
        {icon}
      </span>
      {favicon && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny external favicon; next/image would need per-domain config
        <img
          src={favicon}
          alt=""
          width={44}
          height={44}
          loading="lazy"
          onError={() => setFailed(true)}
          className="relative rounded-token bg-surface p-1"
        />
      ) : (
        <span className="relative text-4xl" aria-hidden>
          {icon}
        </span>
      )}
      {host && (
        <span className="absolute bottom-1 right-2 max-w-[80%] truncate text-[10px] text-muted">
          {host}
        </span>
      )}
    </div>
  );
}
