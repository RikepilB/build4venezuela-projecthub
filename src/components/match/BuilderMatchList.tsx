import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import type { BuilderMatch } from "@/lib/match/types";
import { BuilderCard } from "@/components/builders/BuilderCard";
import { MatchReasons } from "./MatchReasons";

// Project → builders results (recruit): the roster card (reused) + the reasons strip.
// `projects` is empty here — "working on" is a builders-page concern, not a match signal.
export function BuilderMatchList({
  matches,
  locale,
  dict,
}: {
  matches: BuilderMatch[];
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((m) => (
        <li key={m.builder.id} className="flex flex-col gap-2">
          <BuilderCard builder={m.builder} dict={dict} projects={[]} locale={locale} />
          <MatchReasons reasons={m.reasons} dict={dict} />
        </li>
      ))}
    </ul>
  );
}
