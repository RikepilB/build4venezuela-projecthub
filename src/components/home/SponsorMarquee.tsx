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
                className={`inline-flex shrink-0 items-center overflow-hidden rounded-token border border-border transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_0_28px_-10px_var(--b4v-glow-strong)]${
                  duplicate ? " motion-reduce:hidden" : ""
                }`}
              >
                {s.logo ? (
                  // Each sponsor's own logo carries its brand colors/design — this IS the
                  // per-sponsor distinction. The logo (height-normalized to 96px) fills the
                  // card; the rounded border clips it. eslint-disable: small local asset,
                  // next/image would need per-asset config (matches SiteThumb).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/sponsors/${s.logo}`} alt={s.name} className="block h-10 w-auto" />
                ) : (
                  <span className="whitespace-nowrap bg-surface px-4 py-2.5 text-sm font-semibold text-text">
                    {s.name}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
