"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ApiResponse } from "@/lib/api/response";

// Live vote overlay. Catalog pages can be CDN-cached, which means the vote counts baked
// into the HTML may be stale. This provider fetches the server-authoritative
// { slug: count } map from /api/v1/votes on the client and overlays it, so counts stay
// fresh without forcing the page to render dynamically on every request.
//
// This is NOT an optimistic update: the number always comes from the server (the API
// reads the same store the page does), so it can never double-count — it only ever
// replaces a stale count with the current one (see the vote invariant in CLAUDE.md).

type VoteMap = Record<string, number>;

interface LiveVotesValue {
  votes: VoteMap;
  refresh: () => void;
}

const LiveVotesContext = createContext<LiveVotesValue | null>(null);

export function LiveVotesProvider({ children }: { children: React.ReactNode }) {
  const [votes, setVotes] = useState<VoteMap>({});
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return; // coalesce overlapping fetches (mount + focus)
    inFlight.current = true;
    try {
      const res = await fetch("/api/v1/votes", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as ApiResponse<VoteMap>;
      if (json.success && json.data) setVotes(json.data);
    } catch {
      // Network / parse error → keep the server-rendered counts (graceful fallback).
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    // refresh() only setState()s after `await fetch` (a network round-trip), never
    // synchronously, so it can't cascade renders — but the compiler lint can't see
    // through the async boundary, hence the scoped disable on this one call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(); // initial overlay after hydration
    const onFocus = () => void refresh(); // re-sync when the tab regains focus
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return <LiveVotesContext.Provider value={{ votes, refresh }}>{children}</LiveVotesContext.Provider>;
}

// Live count for one slug, or undefined when the overlay hasn't loaded yet or there is
// no provider above (callers fall back to the server-rendered prop in that case).
export function useLiveVote(slug: string): number | undefined {
  return useContext(LiveVotesContext)?.votes[slug];
}

// Re-fetch the overlay (e.g. right after a confirmed vote). No-op outside a provider.
export function useRefreshVotes(): () => void {
  return useContext(LiveVotesContext)?.refresh ?? (() => {});
}
