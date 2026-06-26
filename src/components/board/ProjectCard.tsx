import Link from "next/link";
import type { Locale, Project } from "@/lib/types";
import { localePath } from "@/lib/i18n/href";
import { Tag } from "@/components/ui/Tag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NeedBadges } from "./NeedBadges";
import { categories, labelFor } from "@/lib/taxonomy";

export function ProjectCard({ project, locale }: { project: Project; locale: Locale }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-token border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={localePath(locale, `/projects/${project.slug}`)}
          className="font-semibold text-text hover:text-primary"
        >
          {project.name}
        </Link>
        <StatusBadge status={project.status} locale={locale} />
      </div>
      <p className="line-clamp-3 text-sm text-muted">{project.summary}</p>
      <div className="mt-auto flex flex-wrap gap-1.5">
        {project.categories.map((c) => (
          <Tag key={c}>{labelFor(categories, c, locale)}</Tag>
        ))}
        {project.stack.slice(0, 4).map((s) => (
          <Tag key={s}>{s}</Tag>
        ))}
      </div>
      <NeedBadges needs={project.needs} locale={locale} />
    </article>
  );
}
