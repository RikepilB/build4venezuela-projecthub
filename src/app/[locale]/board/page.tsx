import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";
import { projectRepository, membershipRepository } from "@/lib/repository";
import { applyFilter } from "@/lib/repository/projects.repo";
import { boardListing } from "@/lib/ecosystem";
import { FilterBar } from "@/components/board/FilterBar";
import { ProjectCard } from "@/components/board/ProjectCard";
import { RadarStats } from "@/components/board/RadarStats";
import { LiveVotesProvider } from "@/components/votes/LiveVotes";
import { BoardCallout } from "@/components/board/BoardCallout";
import { HackathonCountdown } from "@/components/board/HackathonCountdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { z } from "zod";
import {
  Complexity as ComplexityEnum,
  Locale as LocaleEnum,
  NeedType as NeedEnum,
  Priority as PriorityEnum,
  ProjectStatus as StatusEnum,
} from "@/lib/schemas";
import type { ProjectFilter } from "@/lib/types";

type SP = Record<string, string | string[] | undefined>;
const one = (v: SP[string]) => (typeof v === "string" && v ? v : undefined);

// Read a searchParam only when it's a valid member of the given Zod enum, else
// undefined. The URL is untrusted input: an unknown value must be dropped, not cast.
// Matters most for `need`, which indexes p.needs — a bogus ?need= would otherwise
// throw in applyFilter and crash the whole board render.
function parseEnum<S extends z.ZodTypeAny>(schema: S, v: SP[string]): z.infer<S> | undefined {
  const s = one(v);
  if (!s) return undefined;
  const r = schema.safeParse(s);
  return r.success ? r.data : undefined;
}

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
    category: one(sp.category), // free taxonomy id — a non-matching value just yields no results
    stack: one(sp.stack), // free text — string compare, safe on garbage
    language: parseEnum(LocaleEnum, sp.language),
    status: parseEnum(StatusEnum, sp.status),
    need: parseEnum(NeedEnum, sp.need),
    priority: parseEnum(PriorityEnum, sp.priority),
    complexity: parseEnum(ComplexityEnum, sp.complexity),
  };

  // The board lands on a high-signal view: only high-priority projects, so the
  // team reads what matters at a glance. Any active filter, or an explicit
  // `?view=all`, expands to the full set (discovery is preserved, not deleted).
  const hasFilter = Object.values(filter).some(Boolean);
  const showAll = one(sp.view) === "all" || hasFilter;

  // One ranked read; derive the filtered view in-memory (applyFilter is pure and
  // order-preserving) so RadarStats and the grid share a single dataset. Repo-less
  // initiative sites live on /ecosystem; the board carries buildable repos PLUS
  // shipped/live projects (boardListing). Memberships → "people assigned" per card.
  const [ranked, memberships] = await Promise.all([
    projectRepository.list(),
    membershipRepository.list(),
  ]);
  const all = boardListing(ranked);
  const filtered = applyFilter(all, filter);
  const projects = showAll ? filtered : filtered.filter((p) => p.priority === "high");
  const highCount = all.filter((p) => p.priority === "high").length;

  const teamCounts = new Map<string, number>();
  for (const m of memberships) teamCounts.set(m.project_slug, (teamCounts.get(m.project_slug) ?? 0) + 1);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">{dict.nav.board}</p>
        <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight text-text sm:text-4xl">
          {dict.board.title}
        </h1>
        <p className="mt-2 text-muted">{dict.board.subtitle}</p>
      </header>

      <BoardCallout dict={dict} />

      <HackathonCountdown dict={dict} />

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
        // Live vote overlay: the board HTML can be CDN-cached, so cards fetch the
        // current { slug: count } map client-side and overlay it (server-authoritative,
        // never an optimistic +1).
        <LiveVotesProvider>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                locale={locale}
                dict={dict}
                teamCount={teamCounts.get(p.slug) ?? 0}
              />
            ))}
          </div>
        </LiveVotesProvider>
      ) : (
        <EmptyState title={dict.board.empty} />
      )}
    </section>
  );
}
