"use client";

import { useSyncExternalStore } from "react";
import type { Dictionary } from "@/lib/i18n/config";

// Hackathon submission deadline — single source of truth. Edit this one line to retarget
// the countdown. Anchored to Venezuela time (VET, UTC-4) via an explicit offset, so every
// viewer counts down to the SAME instant regardless of their own timezone.
export const HACKATHON_DEADLINE = new Date("2026-06-29T00:59:00-04:00");

// A 1-second ticking clock exposed as an external store, so the countdown is both
// hydration-safe and React-Compiler-clean (no setState-in-effect — same rationale as the
// vote guard in CLAUDE.md). getSnapshot buckets to whole seconds so it returns a stable
// value within each second (useSyncExternalStore compares snapshots with Object.is).
// getServerSnapshot returns a fixed sentinel (0) so the server HTML and the first client
// render match; React swaps in the live time right after hydration.
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}
const getSnapshot = () => Math.floor(Date.now() / 1000);
const getServerSnapshot = () => 0;

const pad = (n: number) => n.toString().padStart(2, "0");

export function HackathonCountdown({ dict }: { dict: Dictionary }) {
  const nowSec = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // nowSec === 0 is the pre-hydration sentinel: render dashes so SSR === first client render.
  const mounted = nowSec !== 0;
  const remainingMs = HACKATHON_DEADLINE.getTime() - nowSec * 1000;
  const ended = mounted && remainingMs <= 0;

  const total = Math.max(0, Math.floor(remainingMs / 1000));
  const units = [
    { value: Math.floor(total / 86400), label: "d" },
    { value: Math.floor((total % 86400) / 3600), label: "h" },
    { value: Math.floor((total % 3600) / 60), label: "m" },
    { value: total % 60, label: "s" },
  ];

  return (
    <div
      role="timer"
      aria-live="off"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-token border border-border bg-surface px-4 py-3"
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">
        {ended ? dict.board.countdownEnded : dict.board.countdownTitle}
      </p>
      {!ended && (
        <div className="flex items-center gap-3 tabular-nums">
          {units.map((u) => (
            <div key={u.label} className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-text">{mounted ? pad(u.value) : "--"}</span>
              <span className="text-xs font-medium text-muted">{u.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
