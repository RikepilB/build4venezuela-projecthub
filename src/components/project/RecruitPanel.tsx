import type { Locale, Project } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { builderRepository } from "@/lib/repository";
import { matchBuildersForProject } from "@/lib/match/score";
import { BuilderMatchList } from "@/components/match/BuilderMatchList";

// PROJECT → BUILDERS panel on the detail page. Server component (zero client JS): loads
// the roster through the repository seam and ranks who fits THIS project's stack + open
// contributor asks. Renders only while the project is actively recruiting contributors.
export async function RecruitPanel({
  project,
  locale,
  dict,
}: {
  project: Project;
  locale: Locale;
  dict: Dictionary;
}) {
  if (project.needs.contributors.length === 0) return null;

  const builders = await builderRepository.list();
  const matches = matchBuildersForProject(project, builders);

  return (
    <section data-testid="recruit-panel" className="flex flex-col gap-3 border-t border-border pt-6">
      <div>
        <h2 className="text-lg font-semibold text-text">{dict.match.recruitTitle}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">{dict.match.recruitBody}</p>
      </div>
      {matches.length > 0 ? (
        <BuilderMatchList matches={matches} locale={locale} dict={dict} />
      ) : (
        <p className="text-sm text-muted">{dict.match.recruitEmpty}</p>
      )}
    </section>
  );
}
