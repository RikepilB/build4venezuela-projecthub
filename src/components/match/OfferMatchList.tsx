import Link from "next/link";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import type { OfferMatch } from "@/lib/match/types";
import { localePath } from "@/lib/i18n/href";
import { StatusBadge } from "@/components/ui/StatusBadge";

// Sponsor → projects results: each project plus the exact asks the offer can cover.
export function OfferMatchList({
  matches,
  locale,
  dict,
}: {
  matches: OfferMatch[];
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {matches.map((m) => (
        <li key={m.project.slug} data-testid="offer-card" className="flex flex-col gap-2.5 rounded-token border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={localePath(locale, `/projects/${m.project.slug}`)}
              className="font-semibold text-text hover:text-primary"
            >
              {m.project.name}
            </Link>
            <StatusBadge status={m.project.status} locale={locale} />
          </div>
          <p className="line-clamp-2 text-sm text-muted">{m.project.summary}</p>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{dict.match.sponsorMatched}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {m.matched.map((need) => (
                <li
                  key={need}
                  className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent"
                >
                  {need}
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
}
