"use client";

import { useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { upvoteProject } from "@/actions/vote-project";

// Per-slug "already voted" flag from localStorage, read hydration-safely. The server
// snapshot is always false (no storage server-side); the client reads the real value
// without a setState-in-effect, and re-reads on the re-render that the post-vote
// revalidatePath triggers. See react-hooks/set-state-in-effect.
function useHasVoted(slug: string): boolean {
  const key = `vote:${slug}`;
  return useSyncExternalStore(
    (onChange) => {
      // Fires for changes made in OTHER tabs; same-tab updates are picked up on the
      // re-render the server action's revalidatePath causes.
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
      <span className="text-sm font-bold tabular-nums">{votes}</span>
    </button>
  );
}

// One vote per browser (localStorage guard) — best-effort, not a security control.
// The server is the source of truth; this just stops obvious double-clicks.
export function VoteButton({ slug, votes, label }: { slug: string; votes: number; label: string }) {
  const voted = useHasVoted(slug);
  return (
    <form
      action={upvoteProject}
      onSubmit={() => {
        try {
          window.localStorage.setItem(`vote:${slug}`, "1");
        } catch {
          // storage unavailable — the server still records the vote
        }
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <Inner votes={votes} voted={voted} label={label} />
    </form>
  );
}
