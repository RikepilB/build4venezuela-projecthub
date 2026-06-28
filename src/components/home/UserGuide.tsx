// Inline one-line disclosure for the search-first flow — a quiet "Quick guide"
// trigger that expands in place (no modal, no auto-open). Native <details> so it's
// accessible and needs no client JS; the panel reuses `rise` (replays on each open,
// since <details> toggles the content between display:none and shown).
export interface UserGuideProps {
  label: string;
  intro: string;
  steps: { title: string; body: string }[];
}

export function UserGuide({ label, intro, steps }: UserGuideProps) {
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
        <ol className="mt-4 flex flex-col gap-4">
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
      </div>
    </details>
  );
}
