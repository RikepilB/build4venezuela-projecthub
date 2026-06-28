import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale, getDictionary } from "@/lib/i18n/config";
import type { Locale } from "@/lib/types";
import { builderRepository, membershipRepository, projectRepository } from "@/lib/repository";
import { BuilderGrid } from "@/components/builders/BuilderGrid";
import { FilterForm } from "@/components/ui/FilterForm";
import { localePath } from "@/lib/i18n/href";
import { normalize } from "@/lib/text";
import { builderFilterOptions } from "@/lib/builders/filter";

import type { Builder } from "@/lib/types";

// ── Filter options derived from live data via builderFilterOptions() ────────────

// Collapsible secondary form — code-split so its client JS defers until the roster
// has rendered. ssr stays on (default) so the markup is still server-rendered.
const AddBuilderForm = dynamic(
  () => import("@/components/builders/AddBuilderForm").then((m) => m.AddBuilderForm),
  { loading: () => <div className="h-12 w-48 animate-pulse rounded-token bg-surface-2" /> },
);

type SP = Record<string, string | string[] | undefined>;
const one = (v: SP[string]) => (typeof v === "string" && v ? v : undefined);

function normalizeStack(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function filterBuilders(
  all: Builder[],
  { availability, timezone, stack, role, status, seniority, q }: {
    availability?: string; timezone?: string; stack?: string;
    role?: string; status?: string; seniority?: string; q?: string;
  },
): Builder[] {
  const wantStack = stack ? normalizeStack(stack) : "";
  return all.filter((b) => {
    if (availability && b.availability !== availability) return false;
    if (timezone && b.timezone !== timezone) return false;
    if (wantStack && !b.stack.some((s) => normalizeStack(s) === wantStack)) return false;
    if (role && b.role !== role) return false;
    if (status && b.status !== status) return false;
    if (seniority && b.seniority !== seniority) return false;
    if (q) {
      const lower = q.toLowerCase();
      if (
        !b.alias.toLowerCase().includes(lower) &&
        !b.stack.some((s) => s.toLowerCase().includes(lower))
      ) return false;
    }
    return true;
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const typed: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(typed);
  return {
    title: `${dict.builders.title} · El Umbral`,
    description: dict.builders.subtitle,
    alternates: {
      canonical: `/${typed}/builders`,
      languages: { en: "/en/builders", es: "/es/builders", "x-default": "/en/builders" },
    },
    openGraph: {
      title: `${dict.builders.title} · El Umbral`,
      description: dict.builders.subtitle,
      locale: typed === "es" ? "es_VE" : "en_US",
    },
  };
}

export default async function BuildersPage({
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
  const availability = one(sp.availability);
  const timezone = one(sp.timezone);
  const stack = one(sp.stack);
  const role = one(sp.role);
  const status = one(sp.status);
  const seniority = one(sp.seniority);
  const q = one(sp.q);

  const all = await builderRepository.list();

  // Derive filter options from live data.
  const filterOpts = builderFilterOptions(all);

  // "Working on": link each builder to the projects they joined (matched by name).
  const [memberships, allProjects] = await Promise.all([
    membershipRepository.list(),
    projectRepository.list(),
  ]);
  const slugToName = new Map(allProjects.map((p) => [p.slug, p.name] as const));
  const projectsByName = new Map<string, { slug: string; name: string }[]>();
  for (const m of memberships) {
    const name = slugToName.get(m.project_slug);
    if (!name) continue;
    const key = normalize(m.name);
    const list = projectsByName.get(key) ?? [];
    if (!list.some((x) => x.slug === m.project_slug)) list.push({ slug: m.project_slug, name });
    projectsByName.set(key, list);
  }
  const workingOn = new Map<string, { slug: string; name: string }[]>(
    all.map((b) => [b.id, projectsByName.get(normalize(b.alias)) ?? []] as const),
  );

  const builders = filterBuilders(all, { availability, timezone, stack, role, status, seniority, q });

  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">{dict.nav.builders}</p>
        <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight text-text sm:text-4xl">
          {dict.builders.title}
        </h1>
        <p className="mt-2 text-muted">{dict.builders.subtitle}</p>
      </header>

      <AddBuilderForm locale={locale} dict={dict} />

      <FilterForm
        base={localePath(locale, "/builders")}
        current={{ availability, timezone, stack, role, status, seniority, q }}
        groups={[
          { name: "availability", label: dict.builders.availability, options: filterOpts.availability.map((v) => ({ value: v, label: v })) },
          { name: "timezone", label: dict.builders.timezone, options: filterOpts.timezone.map((v) => ({ value: v, label: v })) },
          { name: "stack", label: dict.builders.stack, options: filterOpts.stack.map((v) => ({ value: v, label: v })) },
          { name: "role", label: dict.builders.roleFilterLabel, options: filterOpts.role.map((v) => ({ value: v, label: v })) },
          { name: "status", label: dict.builders.statusLabel, options: filterOpts.status.map((v) => ({ value: v, label: v })) },
          { name: "seniority", label: dict.builders.seniorityLabel, options: filterOpts.seniority.map((v) => ({ value: v, label: v })) },
        ].filter((g) => g.options.length > 0)}
        allLabel={dict.builders.all}
        applyLabel={dict.board.filters}
        clearLabel={dict.board.clear}
      />

      <form method="get" action={localePath(locale, "/builders")} role="search" className="flex gap-2 rounded-token border border-border bg-surface p-3">
        {[{ n: "availability", v: availability }, { n: "timezone", v: timezone }, { n: "stack", v: stack }, { n: "role", v: role }, { n: "status", v: status }, { n: "seniority", v: seniority }].filter((x) => x.v).map((x) => (
          <input key={x.n} type="hidden" name={x.n} value={x.v} />
        ))}
        <input type="search" name="q" defaultValue={q} placeholder="Search by name or stack…" className="flex-1 rounded-token border border-border bg-surface px-3 py-2 text-sm text-text" aria-label="Search builders" />
        <button type="submit" className="rounded-token bg-primary px-4 py-2 text-sm font-medium text-primary-ink hover:opacity-90">{dict.board.filters}</button>
      </form>

      <p className="text-sm text-muted">
        {builders.length} {dict.builders.count}
      </p>

      <BuilderGrid builders={builders} dict={dict} workingOn={workingOn} locale={locale} />
    </section>
  );
}
