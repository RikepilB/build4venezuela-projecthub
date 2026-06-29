import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale, getDictionary } from "@/lib/i18n/config";
import type { Locale } from "@/lib/types";
import { referenceRepository } from "@/lib/repository";
import { ReferenceCard } from "@/components/reference/ReferenceCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ReferenceCategory } from "@/lib/types";

// Reference projects — existing open-source disaster-relief tools (global prior art) to
// study or reuse before building from scratch. "Search before you build" extended past
// the hackathon. Grouped by capability, link-out only.
const CATEGORY_ORDER: ReferenceCategory[] = [
  "comms",
  "ingestion",
  "coordination",
  "clinical",
  "modeling",
  "geolocation",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const typed: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(typed);
  return {
    title: `${dict.reference.title} · El Umbral`,
    description: dict.reference.subtitle,
    alternates: {
      canonical: `/${typed}/reference`,
      languages: { en: "/en/reference", es: "/es/reference", "x-default": "/es/reference" },
    },
    openGraph: {
      title: `${dict.reference.title} · El Umbral`,
      description: dict.reference.subtitle,
      locale: typed === "es" ? "es_VE" : "en_US",
    },
  };
}

export default async function ReferencePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const projects = await referenceRepository.list();
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: projects.filter((p) => p.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">{dict.nav.reference}</p>
        <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight text-text sm:text-4xl">
          {dict.reference.title}
        </h1>
        <p className="mt-2 max-w-2xl text-muted">{dict.reference.subtitle}</p>
      </header>

      {projects.length > 0 ? (
        <div className="flex flex-col gap-12">
          {groups.map((g) => (
            <div key={g.category} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 border-border pb-2">
                <h2 className="text-xl font-extrabold uppercase tracking-tight text-text sm:text-2xl">
                  {dict.reference.categories[g.category]}
                </h2>
                <span className="rounded-token bg-surface-2 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-muted">
                  {g.items.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((p) => (
                  <ReferenceCard key={p.id} project={p} dict={dict} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title={dict.reference.empty} />
      )}
    </section>
  );
}
