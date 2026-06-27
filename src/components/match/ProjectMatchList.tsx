import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import type { ProjectMatch } from "@/lib/match/types";
import { ProjectCard } from "@/components/board/ProjectCard";
import { MatchReasons } from "./MatchReasons";

// Builder → projects results: the board card (reused) + a "why you fit" strip beneath.
export function ProjectMatchList({
  matches,
  locale,
  dict,
  teamCount,
}: {
  matches: ProjectMatch[];
  locale: Locale;
  dict: Dictionary;
  teamCount: Map<string, number>;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((m) => (
        <li key={m.project.slug} data-testid="match-card" className="flex flex-col gap-2">
          <ProjectCard
            project={m.project}
            locale={locale}
            dict={dict}
            teamCount={teamCount.get(m.project.slug) ?? 0}
          />
          <MatchReasons reasons={m.reasons} dict={dict} />
        </li>
      ))}
    </ul>
  );
}
