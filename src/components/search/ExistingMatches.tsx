import type { Locale } from "@/lib/types";
import type { SearchHit } from "@/lib/search";
import type { Dictionary } from "@/lib/i18n/config";
import { ProjectCard } from "@/components/board/ProjectCard";

export function ExistingMatches({
  hits,
  locale,
  dict,
}: {
  hits: SearchHit[];
  locale: Locale;
  dict: Dictionary;
}) {
  const strong = hits.filter((h) => h.strength === "strong");
  const possible = hits.filter((h) => h.strength === "possible");

  return (
    <div className="flex flex-col gap-8">
      {strong.length > 0 && (
        <section>
          <p className="mb-3 rounded-token border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {dict.search.strongWarning}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {strong.map((h) => (
              <ProjectCard key={h.project.id} project={h.project} locale={locale} dict={dict} />
            ))}
          </div>
        </section>
      )}
      {possible.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted">{dict.search.possible}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {possible.map((h) => (
              <ProjectCard key={h.project.id} project={h.project} locale={locale} dict={dict} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
