import type { Dictionary } from "@/lib/i18n/config";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { BUILD4VENEZUELA_URL, CRAFTER_STATION_URL } from "@/lib/links";

// Site footer: brand line + a credit line (author · hackathon · collective).
export function Footer({ dict }: { dict: Dictionary }) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center text-xs text-muted">
        <p>
          {dict.appName} · {dict.tagline}
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span>
            {dict.footer.builtBy}{" "}
            <span className="font-medium text-text">Richard Pillaca</span>
          </span>
          <span aria-hidden>·</span>
          <ExternalLink href={BUILD4VENEZUELA_URL}>{dict.footer.hackathon}</ExternalLink>
          <span aria-hidden>·</span>
          <ExternalLink href={CRAFTER_STATION_URL}>{dict.footer.crafterMember}</ExternalLink>
        </p>
      </div>
    </footer>
  );
}
