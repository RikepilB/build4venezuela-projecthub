import Link from "next/link";

// Inline one-line disclosure that expands into a quick MAP of the app — one row per
// section (Board, Shipped & live, Builders, Resources, Reference, Communities), each a
// link straight to that page. Native <details> so it's accessible and needs no client
// JS; the panel reuses `rise` (replays on each open, as <details> toggles display).
export interface UserGuideProps {
  label: string;
  intro: string;
  sections: { href: string; label: string; body: string }[];
}

export function UserGuide({ label, intro, sections }: UserGuideProps) {
  return (
    <details className="group max-w-xl">
      <summary className="inline-flex cursor-pointer select-none list-none items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted underline decoration-border underline-offset-4 transition hover:text-text hover:decoration-primary [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="block">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        {label}
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="block transition-transform group-open:rotate-180"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="rise mt-4 rounded-token border border-border bg-surface p-5">
        <p className="text-sm text-muted">{intro}</p>
        <ul className="mt-3 flex flex-col">
          {sections.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="group/row flex flex-col gap-0.5 rounded-token px-3 py-2.5 transition-colors hover:bg-surface-2"
              >
                <span className="flex items-center gap-1.5 font-display text-base font-semibold text-text">
                  {s.label}
                  <span aria-hidden className="text-primary opacity-0 transition-opacity group-hover/row:opacity-100">
                    →
                  </span>
                </span>
                <span className="text-sm leading-snug text-muted">{s.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
