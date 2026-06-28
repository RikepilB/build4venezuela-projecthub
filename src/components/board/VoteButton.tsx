"use client";

import { useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { upvoteProject } from "@/actions/vote-project";
import { useLiveVote, useRefreshVotes } from "@/components/votes/LiveVotes";

// Per-slug "already voted" flag from localStorage, read hydration-safely. The server
// snapshot is always false (no storage server-side); the client reads the real value
// without a setState-in-effect. Re-reads on the re-render the post-vote setState and
// the action's revalidatePath trigger, and on the `storage` event from other tabs.
function useHasVoted(slug: string): boolean {
  const key = `vote:${slug}`;
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => {
      try {
        return window.localStorage.getItem(key) === "1";
      } catch {
        return false; // private mode / storage disabled → treat as not-yet-voted
      }
    },
    () => false,
  );
}

function Inner({ votes, voted, label }: { votes: number; voted: boolean; label: string }) {
  const { pending } = useFormStatus();
  // Reddit-style vertical control: up-arrow over the count. Arrow lights up (primary)
  // once this browser has voted.
  return (
    <button
      type="submit"
      disabled={pending || voted}
      aria-label={label}
      title={label}
      className="flex w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-token border border-border bg-surface-2 py-1.5 text-text transition hover:border-primary disabled:cursor-not-allowed"
    >
      <span className={`text-base leading-none ${voted ? "text-primary" : "text-muted"} ${pending ? "opacity-50" : ""}`} aria-hidden>
        ▲
      </span>
      {/* `votes` is server-authoritative and already includes this browser's vote once
          persisted — never add an optimistic +1 here or it double-counts after
          revalidation and on later visits. */}
      <span className="text-sm font-bold tabular-nums" data-testid="vote-count">{votes}</span>
    </button>
  );
}

// One vote per browser (localStorage guard) — best-effort, not a security control.
// The server is the source of truth; this just stops obvious double-clicks.
export function VoteButton({ slug, votes, label }: { slug: string; votes: number; label: string }) {
  const stored = useHasVoted(slug);
  const [justVoted, setJustVoted] = useState(false);
  const voted = stored || justVoted;

  // Live overlay (when a LiveVotesProvider is mounted above): prefer the freshly fetched
  // server count over the possibly-CDN-cached prop. `live` is server-authoritative, so
  // this is a stale→current replacement, never an optimistic +1. Falls back to `votes`
  // when there is no provider or the overlay hasn't loaded yet.
  const live = useLiveVote(slug);
  const refreshVotes = useRefreshVotes();
  const displayVotes = live ?? votes;

  // Runs as a form-action transition (useFormStatus reports `pending` for the whole
  // server round-trip + revalidation). We await the server action and act on its
  // RETURN value directly — reliable, unlike reading useActionState's state through
  // the action's own revalidatePath, where the result can be dropped on reconciliation
  // and leave the guard unset (a reload would then re-enable the button → double vote).
  async function formAction(formData: FormData) {
    const result = await upvoteProject(null, formData);
    if (result?.ok) {
      // Persist the per-browser guard only on a CONFIRMED write — a failed persist
      // (read-only FS, no Redis) leaves the control usable instead of locking with an
      // unchanged count.
      try {
        window.localStorage.setItem(`vote:${slug}`, "1");
      } catch {
        // storage unavailable — the server still recorded the vote
      }
      setJustVoted(true);
      refreshVotes(true); // force-pull the new server-authoritative count (bypass coalescing)
    }
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <Inner votes={displayVotes} voted={voted} label={label} />
    </form>
  );
}
