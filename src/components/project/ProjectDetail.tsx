import Link from "next/link";
import type { Locale, Project } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";
import { Tag } from "@/components/ui/Tag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriorityBadge, ComplexityBadge, StarBadge, isVisiblePriority } from "@/components/ui/MetaBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { VoteButton } from "@/components/board/VoteButton";
import { ProjectTeam } from "./ProjectTeam";
import { categories, labelFor } from "@/lib/taxonomy";

function NeedList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-token border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-text">{title}</p>
      {items.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((i) => (
            <li key={i}>
              <Tag>{i}</Tag>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}

// External links are https-validated by the schema; still set rel for safety.
const REL = "noopener noreferrer nofollow";

export function ProjectDetail({
  project,
  locale,
  dict,
}: {
  project: Project;
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <article className="flex flex-col gap-6">
      <div>
        <Link href={localePath(locale, "/board")} className="text-sm text-muted hover:text-text">
          ← {dict.detail.back}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-text">{project.name}</h1>
          <StatusBadge status={project.status} locale={locale} />
          <VoteButton slug={project.slug} votes={project.votes} label={dict.card.vote} />
        </div>
        <p className="mt-3 max-w-2xl text-muted">{project.summary}</p>

        {(isVisiblePriority(project.priority) || project.complexity || project.stars != null) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {isVisiblePriority(project.priority) && <PriorityBadge level={project.priority} locale={locale} />}
            {project.complexity && <ComplexityBadge level={project.complexity} locale={locale} />}
            {project.stars != null && <StarBadge count={project.stars} />}
          </div>
        )}
      </div>

      {project.use_case && (
        <p className="max-w-2xl text-sm text-muted">
          <span className="font-semibold uppercase tracking-wide text-text">{dict.detail.useCase}: </span>
          {project.use_case}
        </p>
      )}

      {typeof project.progress === "number" && (
        <div className="max-w-md">
          <ProgressBar value={project.progress} label={dict.detail.progress} />
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {project.categories.map((c) => (
          <Tag key={c}>{labelFor(categories, c, locale)}</Tag>
        ))}
        {project.stack.map((s) => (
          <Tag key={s}>{s}</Tag>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {project.repo_url && (
          <a
            href={project.repo_url}
            target="_blank"
            rel={REL}
            className="inline-flex items-center gap-1.5 rounded-token bg-primary px-4 py-2 text-sm font-medium text-primary-ink hover:opacity-90"
          >
            {dict.detail.repo} <span aria-hidden>↗</span>
          </a>
        )}
        {project.demo_url && (
          <a
            href={project.demo_url}
            target="_blank"
            rel={REL}
            className="inline-flex items-center gap-1.5 rounded-token border border-border px-4 py-2 text-sm text-text hover:bg-surface-2"
          >
            {dict.detail.demo} <span aria-hidden>↗</span>
          </a>
        )}
      </div>

      <ProjectTeam slug={project.slug} dict={dict} />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-text">{dict.detail.needs}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <NeedList title={dict.detail.contributors} items={project.needs.contributors} empty={dict.detail.none} />
          <NeedList title={dict.detail.apiCredits} items={project.needs.api_credits} empty={dict.detail.none} />
          <NeedList title={dict.detail.sponsors} items={project.needs.sponsors} empty={dict.detail.none} />
        </div>
      </section>

      {project.needs.contributors.length > 0 && (
        <Link
          href={localePath(locale, "/builders")}
          className="text-sm font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
        >
          {dict.detail.findTeam} →
        </Link>
      )}
    </article>
  );
}
