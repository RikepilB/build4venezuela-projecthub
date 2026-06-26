import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/lib/i18n/config";
import { resourceRepository } from "@/lib/repository";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ResourceType } from "@/lib/types";

// Verified relief resources directory — vetted platforms, official orgs, donation
// channels and support lines synced from the team's Google Sheet ("Plataformas
// activas"). Distinct from the board (buildable projects) and ecosystem (live repos):
// this is "use what's verified". Grouped by type, relief-first order.
const TYPE_ORDER: ResourceType[] = [
  "search",
  "official",
  "resources",
  "dev",
  "donation",
  "finance",
  "psychosocial",
  "telecom",
  "other",
];

export default async function ResourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const resources = await resourceRepository.list();
  const groups = TYPE_ORDER.map((type) => ({
    type,
    items: resources.filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">{dict.nav.resources}</p>
        <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight text-text sm:text-4xl">
          {dict.resources.title}
        </h1>
        <p className="mt-2 max-w-2xl text-muted">{dict.resources.subtitle}</p>
      </header>

      {resources.length > 0 ? (
        <div className="flex flex-col gap-12">
          {groups.map((g) => (
            <div key={g.type} className="flex flex-col gap-4">
              {/* Prominent section header: big, bold, white, with a rule underneath
                  + a count chip, so each resource type reads as its own clear section. */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 border-border pb-2">
                <h2 className="text-xl font-extrabold uppercase tracking-tight text-text sm:text-2xl">
                  {dict.resources.types[g.type]}
                </h2>
                <span className="rounded-token bg-surface-2 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-muted">
                  {g.items.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((r) => (
                  <ResourceCard key={r.id} resource={r} dict={dict} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title={dict.resources.empty} />
      )}
    </section>
  );
}
