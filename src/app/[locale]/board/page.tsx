import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";
import { projectRepository } from "@/lib/repository";
import { applyFilter } from "@/lib/repository/projects.repo";
import { isEcosystemProject } from "@/lib/ecosystem";
import { FilterBar } from "@/components/board/FilterBar";
import { ProjectCard } from "@/components/board/ProjectCard";
import { RadarStats } from "@/components/board/RadarStats";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  Complexity,
  Locale,
  NeedType,
  Priority,
  ProjectFilter,
  ProjectStatus,
} from "@/lib/types";

type SP = Record<string, string | string[] | undefined>;
const one = (v: SP[string]) => (typeof v === "string" && v ? v : undefined);

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SP>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const sp = await searchParams;
  const filter: ProjectFilter = {
    category: one(sp.category),
    stack: one(sp.stack),
    language: one(sp.language) as Locale | undefined,
    status: one(sp.status) as ProjectStatus | undefined,
    need: one(sp.need) as NeedType | undefined,
    priority: one(sp.priority) as Priority | undefined,
    complexity: one(sp.complexity) as Complexity | undefined,
  };

  // The board lands on a high-signal view: only high-priority projects, so the
  // team reads what matters at a glance. Any active filter, or an explicit
  // `?view=all`, expands to the full set (discovery is preserved, not deleted).
  const hasFilter = Object.values(filter).some(Boolean);
  const showAll = one(sp.view) === "all" || hasFilter;

  // One ranked read; derive the filtered view in-memory (applyFilter is pure and
  // order-preserving) so RadarStats and the grid share a single dataset. Existing
  // live sites (no repo) live on /ecosystem — the board is for hackathon repos.
  const ranked = await projectRepository.list();
  const all = ranked.filter((p) => !isEcosystemProject(p));
  const filtered = applyFilter(all, filter);
  const projects = showAll ? filtered : filtered.filter((p) => p.priority === "high");
  const highCount = all.filter((p) => p.priority === "high").length;

  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">{dict.nav.board}</p>
        <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight text-text sm:text-4xl">
          {dict.board.title}
        </h1>
        <p className="mt-2 text-muted">{dict.board.subtitle}</p>
      </header>

      <RadarStats projects={all} dict={dict} />

      <FilterBar locale={locale} dict={dict} current={filter} projects={all} showAll={showAll} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {projects.length} {showAll ? dict.board.count : dict.board.countHigh}
        </p>
        {/* High-priority ↔ all is a clear, always-visible segmented toggle (not a
            single easy-to-miss link). Hidden while a dropdown filter is active,
            since any filter already expands to the full set. */}
        {!hasFilter && (
          <div className="inline-flex items-center gap-1 rounded-token border border-border bg-surface p-1 text-sm">
            <Link
              href={localePath(locale, "/board")}
              aria-current={!showAll ? "true" : undefined}
              className={`rounded-token px-3 py-1.5 font-medium transition ${
                !showAll ? "bg-primary text-primary-ink" : "text-muted hover:text-text"
              }`}
            >
              {dict.board.viewPriority} ({highCount})
            </Link>
            <Link
              href={localePath(locale, "/board?view=all")}
              aria-current={showAll ? "true" : undefined}
              className={`rounded-token px-3 py-1.5 font-medium transition ${
                showAll ? "bg-primary text-primary-ink" : "text-muted hover:text-text"
              }`}
            >
              {dict.board.viewAll} ({all.length})
            </Link>
          </div>
        )}
      </div>

      {projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} locale={locale} dict={dict} />
          ))}
        </div>
      ) : (
        <EmptyState title={dict.board.empty} />
      )}
    </section>
  );
}
