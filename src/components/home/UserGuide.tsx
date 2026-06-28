"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";

const SEEN_KEY = "elumbral:guide-seen";

// Per-browser "already saw the guide" flag, read hydration-safely. Server snapshot is
// `true` (seen) so SSR never renders an open dialog; the client reads the real value
// without a setState-in-effect, and re-renders to auto-open on a genuine first visit.
function useSeenGuide(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => {
      try {
        return window.localStorage.getItem(SEEN_KEY) === "1";
      } catch {
        return false; // private mode → still surface the guide rather than suppress it
      }
    },
    () => true, // server: assume seen → no auto-open during SSR/hydration
  );
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // storage unavailable — the guide just re-opens next visit, harmless
  }
}

export interface UserGuideProps {
  open: string;
  title: string;
  intro: string;
  steps: { title: string; body: string }[];
  closeLabel: string;
  cta: string;
  browseLabel: string;
  browseHref: string;
}

export function UserGuide({
  open: openLabel,
  title,
  intro,
  steps,
  closeLabel,
  cta,
  browseLabel,
  browseHref,
}: UserGuideProps) {
  const seen = useSeenGuide();
  // null → follow the auto rule (open on first visit); true/false → explicit user choice.
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? !seen;
  const closeRef = useRef<HTMLButtonElement>(null);

  function show() {
    markSeen();
    setOverride(true);
  }
  function close() {
    markSeen();
    setOverride(false);
  }

  // While open: lock body scroll, close on Escape, move focus to the dismiss button.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted underline decoration-border underline-offset-4 transition hover:text-text hover:decoration-primary"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="block">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        {openLabel}
      </button>

      {open && (
        <div
          className="fade-in fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            onClick={(e) => e.stopPropagation()}
            className="rise relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-token border border-border bg-surface p-7 shadow-2xl"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label={closeLabel}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-token border border-border text-muted transition hover:text-text"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="block">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <p className="eyebrow">El Umbral</p>
            <h2
              id="guide-title"
              className="mt-2 font-display text-2xl font-semibold tracking-tight text-text"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm text-muted">{intro}</p>

            <ol className="mt-6 flex flex-col gap-4">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-ink"
                  >
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="font-display text-base font-semibold text-text">{s.title}</p>
                    <p className="text-sm leading-snug text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={close}
                className="rounded-token bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-primary-ink transition hover:opacity-90"
              >
                {cta}
              </button>
              <Link
                href={browseHref}
                onClick={close}
                className="rounded-token border border-border px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-text transition hover:border-primary hover:text-primary"
              >
                {browseLabel}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
