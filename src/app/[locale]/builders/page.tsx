import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/lib/i18n/config";
import { builderRepository, membershipRepository, projectRepository } from "@/lib/repository";
import { BuilderGrid } from "@/components/builders/BuilderGrid";
import { FilterForm } from "@/components/ui/FilterForm";
import { localePath } from "@/lib/i18n/href";
import { normalize } from "@/lib/text";
import { builderFilterOptions, applyBuilderFilter } from "@/lib/builders/filter";

// Collapsible secondary form — code-split so its client JS defers until the roster
// has rendered. ssr stays on (default) so the markup is still server-rendered.
const AddBuilderForm = dynamic(
  () => import("@/components/builders/AddBuilderForm").then((m) => m.AddBuilderForm),
  { loading: () => <div className="h-12 w-48 animate-pulse rounded-token bg-surface-2" /> },
);

type SP = Record<string, string | string[] | undefined>;
const one = (v: SP[string]) => (typeof v === "string" && v ? v : undefined);

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

  const all = await builderRepository.list();
  const {
    availability: availabilityOptions,
    timezone: timezoneOptions,
    stack: stackOptions,
  } = builderFilterOptions(all);

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

  const builders = applyBuilderFilter(all, { availability, timezone, stack });

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
        current={{ availability, timezone, stack }}
        groups={[
          { name: "availability", label: dict.builders.availability, options: availabilityOptions.map((a) => ({ value: a, label: a })) },
          { name: "timezone", label: dict.builders.timezone, options: timezoneOptions.map((t) => ({ value: t, label: t })) },
          { name: "stack", label: dict.builders.stack, options: stackOptions.map((s) => ({ value: s, label: s })) },
        ].filter((g) => g.options.length > 0)}
        allLabel={dict.builders.all}
        applyLabel={dict.board.filters}
        clearLabel={dict.board.clear}
      />

      <p className="text-sm text-muted">
        {builders.length} {dict.builders.count}
      </p>

      <BuilderGrid builders={builders} dict={dict} workingOn={workingOn} locale={locale} />
    </section>
  );
}
