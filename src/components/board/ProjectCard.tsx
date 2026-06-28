import Link from "next/link";
import type { Locale, Project } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";
import { Tag } from "@/components/ui/Tag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { PeopleBadge, ContributorsBadge } from "@/components/ui/MetaBadge";
import { NeedBadges } from "./NeedBadges";
import { VoteButton } from "./VoteButton";

// Deliberately sparse: only what a builder needs to pick a project and help —
// name, stage, what it does, the stack to match skills, what it needs, and who is
// already on it. Complexity/stars/use-case/progress live on the detail page.
export function ProjectCard({
  project,
  locale,
  dict,
  teamCount = 0,
}: {
  project: Project;
  locale: Locale;
  dict: Dictionary;
  teamCount?: number;
}) {
  const detailHref = localePath(locale, `/projects/${project.slug}`);
  return (
    <article className="flex h-full gap-3 rounded-token border border-border bg-surface p-4">
      <VoteButton slug={project.slug} votes={project.votes} label={dict.card.vote} />

      <div className="flex flex-1 flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <Link href={detailHref} className="font-semibold text-text hover:text-primary">
            {project.name}
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Shipped marker: a finished, live project (100%). Distinguishes it from a
                live-but-still-evolving one (status "live", progress < 100). */}
            {project.progress === 100 && (
              <span className="inline-flex items-center rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                100%
              </span>
            )}
            <StatusBadge status={project.status} locale={locale} />
          </div>
        </div>

        <p className="line-clamp-2 text-sm text-muted">{project.summary}</p>

        {project.stack.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.stack.slice(0, 3).map((s) => (
              <Tag key={s}>{s}</Tag>
            ))}
          </div>
        )}

        <NeedBadges needs={project.needs} locale={locale} />

        {(teamCount > 0 || project.contributors != null) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {teamCount > 0 && <PeopleBadge count={teamCount} label={dict.card.assigned} />}
            {project.contributors != null && (
              <ContributorsBadge count={project.contributors} label={dict.card.contributors} />
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-sm">
          {project.repo_url ? (
            <ExternalLink href={project.repo_url}>{dict.card.repo}</ExternalLink>
          ) : project.demo_url ? (
            // Shipped/live with no repo: link straight to the live site, not "+ Add repo".
            <ExternalLink href={project.demo_url}>{dict.card.page}</ExternalLink>
          ) : (
            <Link
              href={detailHref}
              className="font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
            >
              {dict.card.addRepo}
            </Link>
          )}
          <Link
            href={detailHref}
            className="font-medium text-text underline decoration-border underline-offset-2 hover:decoration-primary hover:text-primary"
          >
            {dict.card.viewDetails} →
          </Link>
        </div>
      </div>
    </article>
  );
}
