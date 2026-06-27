"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface MobileNavItem {
  href: string;
  label: string;
}

// Collapsible primary nav for < lg. The Header renders the same links inline on
// lg+ (hidden lg:flex) and hands the small {href,label} list here for the phone
// disclosure — so there's one source of truth for the routes. Client-only because
// it owns the open/closed toggle; the panel is keyboard-dismissible (Escape) and
// closes on any navigation so the next page never opens with a stale menu.
export function MobileNav({
  items,
  submit,
  repo,
  lang,
  menuLabel,
  closeLabel,
}: {
  items: MobileNavItem[];
  submit: { href: string; label: string };
  repo: { href: string; label: string };
  lang: { href: string; label: string; aria: string };
  menuLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  // Escape closes the panel — expected for any disclosure/menu.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? closeLabel : menuLabel}
        className="flex h-10 w-10 items-center justify-center rounded-token border border-border text-text transition hover:border-primary hover:text-primary"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="block">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M3 6h18M3 12h18M3 18h18" />
          )}
        </svg>
      </button>

      {open && (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-full z-50 border-b border-border bg-bg shadow-lg"
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label="Primary">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="rounded-token px-3 py-3 text-sm uppercase tracking-widest text-muted transition hover:bg-surface hover:text-text"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href={submit.href}
              onClick={close}
              className="mt-1 rounded-token bg-primary px-3 py-3 text-center text-sm font-bold uppercase tracking-widest text-primary-ink transition hover:opacity-90"
            >
              {submit.label}
            </Link>

            <div className="mt-1 flex items-center gap-2">
              <a
                href={repo.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label={repo.label}
                title={repo.label}
                onClick={close}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-token border border-border px-3 text-xs uppercase tracking-widest text-muted transition hover:text-text"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden className="block">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.02-1.49-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.81.06 1.24.83 1.24.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                {repo.label}
              </a>
              <Link
                href={lang.href}
                onClick={close}
                aria-label={lang.aria}
                className="flex h-10 w-14 items-center justify-center rounded-token border border-border text-sm font-bold uppercase tracking-widest text-muted transition hover:text-text"
              >
                {lang.label}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
