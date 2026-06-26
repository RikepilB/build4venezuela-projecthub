import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/lib/i18n/config";
import { projectRepository } from "@/lib/repository";
import { FilterBar } from "@/components/board/FilterBar";
import { ProjectCard } from "@/components/board/ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Locale, NeedType, ProjectFilter, ProjectStatus } from "@/lib/types";

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
  };

  const projects = await projectRepository.list(filter);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text">{dict.board.title}</h1>
        <p className="mt-1 text-muted">{dict.board.subtitle}</p>
      </header>

      <FilterBar locale={locale} dict={dict} current={filter} />

      <p className="text-sm text-muted">
        {projects.length} {dict.board.count}
      </p>

      {projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} locale={locale} />
          ))}
        </div>
      ) : (
        <EmptyState title={dict.board.empty} />
      )}
    </section>
  );
}
