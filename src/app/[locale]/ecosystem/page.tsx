import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale, getDictionary } from "@/lib/i18n/config";
import type { Locale } from "@/lib/types";
import { projectRepository } from "@/lib/repository";
import { ecosystemListing } from "@/lib/ecosystem";
import { EcosystemCard } from "@/components/ecosystem/EcosystemCard";
import { EmptyState } from "@/components/ui/EmptyState";

// Existing relief projects (live sites, no open repo) PLUS launched buildable projects
// (repo + live demo, >50% built — e.g. Mission VE). The board stays focused on
// hackathon collaborate-on-code projects; these live here so people can find and use
// what already exists. Ranked the same way (votes → priority → stars → status).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const typed: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(typed);
  return {
    title: `${dict.ecosystem.title} · El Umbral`,
    description: dict.ecosystem.subtitle,
    alternates: {
      canonical: `/${typed}/ecosystem`,
      languages: { en: "/en/ecosystem", es: "/es/ecosystem", "x-default": "/en/ecosystem" },
    },
    openGraph: {
      title: `${dict.ecosystem.title} · El Umbral`,
      description: dict.ecosystem.subtitle,
      locale: typed === "es" ? "es_VE" : "en_US",
    },
  };
}

export default async function EcosystemPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const all = await projectRepository.list();
  const projects = ecosystemListing(all);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">{dict.nav.ecosystem}</p>
        <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight text-text sm:text-4xl">
          {dict.ecosystem.title}
        </h1>
        <p className="mt-2 max-w-2xl text-muted">{dict.ecosystem.subtitle}</p>
      </header>

      <p className="text-sm text-muted">
        {projects.length} {dict.board.count}
      </p>

      {projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <EcosystemCard key={p.id} project={p} dict={dict} />
          ))}
        </div>
      ) : (
        <EmptyState title={dict.ecosystem.empty} />
      )}
    </section>
  );
}
