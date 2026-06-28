import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale, defaultLocale, getDictionary, type Dictionary } from "@/lib/i18n/config";
import type { Locale } from "@/lib/types";
import { localePath } from "@/lib/i18n/href";
import { resourceRepository } from "@/lib/repository";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Resource, ResourceType } from "@/lib/types";

// ── Verified resource IDs (curated primary list) ─────────────────────────────────
const VERIFIED = new Set([
  "res-desaparecidos-terremoto-venezuela",
  "res-venezuela-te-busca",
  "res-encuentrame-vzla",
  "res-pacientes-terremoto-vzla",
  "res-hospitales-en-venezuela",
  "res-paho-oms-venezuela-response",
  "res-reliefweb-venezuela-situation",
  "res-ayuda-terremoto-venezuela",
  "res-centro-recursos-venezuela",
  "res-vzla-response-hub",
  "res-terremoto-hazlohoy",
  "res-ayuda-en-camino",
  "res-venezuela-earthquake-map-github",
  "res-yummy-sos",
  "res-tilores-venezuela-te-busca",
  "res-aparecio-mi-gente",
  "res-venezuela-help-acopios",
  "res-cruz-roja-espanola",
  "res-unicef-emergencia-venezuela",
  "res-save-the-children",
  "res-we-love-foundation-gofundme",
  "res-fondo-emergencia-academiasucab",
  "res-meru-remesas-sin-comision",
  "res-banesco-duplica-donaciones",
  "res-psicolinea-venezuela-ucab",
  "res-grupo-venemergencia",
  "res-movistar-o2-masorange",
  "res-reconecta-venezuela",
]);

// ── Verified tab sub-sections with their resource IDs ────────────────────────────
interface Section {
  key: string;
  ids: string[];
}

function verifiedSections(): Section[] {
  return [
    { key: "findPeople", ids: ["res-desaparecidos-terremoto-venezuela", "res-venezuela-te-busca", "res-encuentrame-vzla", "res-pacientes-terremoto-vzla", "res-hospitales-en-venezuela"] },
    { key: "official", ids: ["res-paho-oms-venezuela-response", "res-reliefweb-venezuela-situation"] },
    { key: "resourceHubs", ids: ["res-ayuda-terremoto-venezuela", "res-centro-recursos-venezuela", "res-vzla-response-hub", "res-terremoto-hazlohoy", "res-ayuda-en-camino"] },
    { key: "tech", ids: ["res-venezuela-earthquake-map-github", "res-yummy-sos", "res-tilores-venezuela-te-busca", "res-aparecio-mi-gente", "res-venezuela-help-acopios"] },
    { key: "donations", ids: ["res-cruz-roja-espanola", "res-unicef-emergencia-venezuela", "res-save-the-children", "res-we-love-foundation-gofundme", "res-fondo-emergencia-academiasucab"] },
    { key: "finance", ids: ["res-meru-remesas-sin-comision", "res-banesco-duplica-donaciones"] },
    { key: "psychosocial", ids: ["res-psicolinea-venezuela-ucab", "res-grupo-venemergencia"] },
    { key: "telecom", ids: ["res-movistar-o2-masorange", "res-reconecta-venezuela"] },
  ];
}

// ── Other-resources sub-sections (type-based grouping) ───────────────────────────
const OTHER_TYPE_ORDER: ResourceType[] = [
  "search",
  "resources",
  "dev",
  "other",
  "donation",
  "finance",
  "psychosocial",
  "telecom",
];

// Tab-switch component
const tabClass = (active: boolean) =>
  `rounded-token border px-4 py-2 text-sm font-bold uppercase tracking-widest ${
    active ? "border-primary bg-primary text-primary-ink" : "border-border text-muted hover:text-text"
  }`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const typed: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(typed);
  return {
    title: `${dict.resources.title} · El Umbral`,
    description: dict.resources.subtitle,
    alternates: {
      canonical: `/${typed}/resources`,
      languages: { en: "/en/resources", es: "/es/resources", "x-default": "/en/resources" },
    },
    openGraph: {
      title: `${dict.resources.title} · El Umbral`,
      description: dict.resources.subtitle,
      locale: typed === "es" ? "es_VE" : "en_US",
    },
  };
}

export default async function ResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const sp = await searchParams;
  const tab = sp.tab === "all" ? "all" : "verified";
  const base = localePath(locale, "/resources");

  const all = await resourceRepository.list();
  const verified = all.filter((r) => VERIFIED.has(r.id));
  const others = all.filter((r) => !VERIFIED.has(r.id));

  return (
    <section className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">{dict.nav.resources}</p>
        <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight text-text sm:text-4xl">
          {dict.resources.title}
        </h1>
        <p className="mt-2 max-w-2xl text-muted">{dict.resources.subtitle}</p>
      </header>

      <div className="flex gap-2">
        <Link href={base} className={tabClass(tab === "verified")}>
          {dict.resources.tabVerified}
        </Link>
        <Link href={`${base}?tab=all`} className={tabClass(tab === "all")}>
          {dict.resources.tabAll}
        </Link>
      </div>

      {tab === "verified" ? (
        <VerifiedContent verified={verified} dict={dict} />
      ) : (
        <OtherContent others={others} dict={dict} />
      )}
    </section>
  );
}

function VerifiedContent({ verified, dict }: { verified: Resource[]; dict: Dictionary }) {
  if (verified.length === 0) return <EmptyState title={dict.resources.empty} />;

  const groups = verifiedSections()
    .map((s) => ({ ...s, items: s.ids.map((id) => verified.find((r) => r.id === id)).filter(Boolean) as Resource[] }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="flex flex-col gap-12">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 border-border pb-2">
            <h2 className="text-xl font-extrabold uppercase tracking-tight text-text sm:text-2xl">
              {dict.resources.sections[g.key as keyof typeof dict.resources.sections]}
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
  );
}

function OtherContent({ others, dict }: { others: Resource[]; dict: Dictionary }) {
  if (others.length === 0) return <EmptyState title={dict.resources.empty} />;

  const groups = OTHER_TYPE_ORDER.map((type) => ({
    type,
    items: others.filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-12">
      {groups.map((g) => (
        <div key={g.type} className="flex flex-col gap-4">
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
  );
}
