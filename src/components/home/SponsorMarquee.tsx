import type { CSSProperties } from "react";
import type { Sponsor } from "@/lib/types";

// Auto-scrolling sponsor strip shown under the hero. Pure CSS (server component): the
// track renders the list twice and the `sponsor-marquee` utility (globals.css) slides
// it rightward, seamlessly. The duplicate chips are aria-hidden + untabbable so screen
// readers and keyboard users hit each sponsor exactly once; they also hide under
// prefers-reduced-motion, leaving a static, readable row.
export function SponsorMarquee({ sponsors, label }: { sponsors: Sponsor[]; label: string }) {
  if (sponsors.length === 0) return null;

  const chips = [...sponsors, ...sponsors];

  return (
    <section className="bleed flex flex-col gap-4 border-y border-border bg-surface/40 py-7" aria-label={label}>
      <p className="eyebrow text-center">{label}</p>
      <div
        className="sponsor-marquee [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]"
        style={{ "--sponsor-count": sponsors.length } as CSSProperties}
      >
        <div>
          {chips.map((s, i) => {
            const duplicate = i >= sponsors.length;
            return (
              <a
                key={`${s.id}-${i}`}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                title={s.blurb || s.name}
                aria-hidden={duplicate || undefined}
                tabIndex={duplicate ? -1 : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-token border border-border bg-surface px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-text transition-colors hover:border-primary${
                  duplicate ? " motion-reduce:hidden" : ""
                }`}
              >
                {s.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- small local sponsor logo; next/image would need per-asset config
                  <img
                    src={`/sponsors/${s.logo}`}
                    alt={s.name}
                    width={24}
                    height={24}
                    className="h-6 w-6 object-contain"
                  />
                ) : null}
                <span>{s.name}</span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
