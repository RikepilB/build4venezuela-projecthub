import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { isLocale, defaultLocale, getDictionary, type Dictionary } from "@/lib/i18n/config";
import type { Locale, Project } from "@/lib/types";
import { membershipRepository, projectRepository } from "@/lib/repository";
import { rankProjects } from "@/lib/repository/projects.repo";
import { FilterForm } from "@/components/ui/FilterForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { localePath } from "@/lib/i18n/href";
import { stackKey } from "@/lib/builders/filter";

import { matchProjectsForBuilder, matchProjectsForOffer } from "@/lib/match/score";
import { ProjectMatchList } from "@/components/match/ProjectMatchList";
import { OfferMatchList } from "@/components/match/OfferMatchList";
import type { MatchProfile, ProjectMatch, OfferMatch } from "@/lib/match/types";

// Live data (votes/needs/roster change at runtime), same as /board and /builders.
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: SP[string]) => (typeof v === "string" && v ? v : undefined);
const many = (v: SP[string]): string[] => (Array.isArray(v) ? v.filter(Boolean) : v ? [v] : []);

// Validate at the boundary (external input): cap sizes, never throw — fail soft to an
// empty profile/offer the way the rest of the app degrades. See coding-rules.md.
const StackInput = z.array(z.string().trim().min(1).max(40)).max(20).catch([]);
const OfferInput = z.string().trim().max(80).catch("");

const tab = (active: boolean) =>
  `rounded-token border px-4 py-2 text-sm font-bold uppercase tracking-widest ${
    active ? "border-primary bg-primary text-primary-ink" : "border-border text-muted hover:text-text"
  }`;

// ── Curated filter options ─────────────────────────────────────────────────────

const ROLE_KEYWORDS: Record<string, string[]> = {
  Frontend: ["frontend", "front-end", "react", "next.js", "vue", "angular", "css", "html", "ui", "canvas"],
  Backend: ["backend", "back-end", "api", "server", "python", "node.js", "java", "go", "rust", "php", "fastapi", "golang", "rest"],
  "Full Stack": ["fullstack", "full-stack", "full stack"],
  "UI/UX": ["ui", "ux", "design", "figma", "user interface", "user experience", "diseño", "ux/ui"],
  "AI / ML": ["ai", "ml", "machine learning", "llm", "rag", "embedding", "openai", "gpt", "neural", "computer vision", "inteligencia artificial"],
  "Cloud / DevOps": ["devops", "deploy", "ci/cd", "docker", "kubernetes", "infra", "hosting", "cloud", "aws", "gcp"],
  Mobile: ["mobile", "react native", "flutter", "android", "ios", "kotlin", "swift", "ionic", "bluetooth"],
  "Data / Analytics": ["data", "analytics", "dashboard", "tableau", "pgvector", "etl", "pipeline", "scraper", "database"],
  "QA / Testing": ["qa", "test", "tester", "testing"],
  Security: ["security", "auth", "authentication", "cybersecurity", "protección"],
};

const ROLE_OPTIONS = Object.keys(ROLE_KEYWORDS);

function roleFilter(projects: Project[], role: string | undefined): Project[] {
  if (!role || role === "any") return projects;
  const keywords = ROLE_KEYWORDS[role];
  if (!keywords) return projects;
  return projects.filter((p) => {
    const all = [
      ...p.stack,
      ...p.needs.contributors,
      ...p.needs.api_credits,
      ...p.needs.sponsors,
    ].map((s) => s.toLowerCase());
    return keywords.some((kw) => all.some((s) => s.includes(kw)));
  });
}

function stackFilter(projects: Project[], stack: string | undefined): Project[] {
  if (!stack || stack === "any") return projects;
  const key = stackKey(stack);
  return projects.filter((p) => p.stack.some((s) => stackKey(s) === key));
}

const STACK_OPTIONS = [
  // AI & Data
  "AI",
  "AI / ML",
  "Computer Vision",
  "Embeddings",
  "LLM",
  "RAG",
  // Web Frontend
  "Canvas API",
  "Next.js",
  "React",
  "TypeScript",
  "UI/UX Design",
  // Web Backend
  "FastAPI",
  "Go",
  "Node.js",
  "Python",
  "REST API",
  // Database
  "Pgvector",
  "Postgres",
  "SQLite",
  "Supabase",
  // Mobile & Desktop
  "Flutter",
  "Kotlin",
  "Mobile (React Native)",
  // Infrastructure
  "Cloud",
  // PWA & Offline
  "Dexie.js",
  "Offline-first",
  "PWA",
  // Maps
  "Leaflet",
  "Mapbox",
  "MapLibre",
  // Automation & Bots
  "Discord",
  "N8N",
  "Twilio API",
  // Networking & Media
  "Bluetooth LE",
  "P2P",
  "Video",
  // General
  "Web",
];

const TIMEZONE_OPTIONS = [
  "UTC-12", "UTC-11", "UTC-10", "UTC-9", "UTC-8", "UTC-7", "UTC-6",
  "UTC-5 (Bogotá)", "UTC-4", "UTC-3", "UTC-2", "UTC-1",
  "UTC", "UTC+1", "UTC+2", "UTC+3", "UTC+4", "UTC+5",
  "UTC+6", "UTC+7", "UTC+8", "UTC+9", "UTC+10", "UTC+11", "UTC+12", "UTC+13", "UTC+14",
];

const STAGE_OPTIONS = [
  { value: "idea", labelKey: "stageIdea" as const },
  { value: "in-progress", labelKey: "stageProgress" as const },
  { value: "mvp", labelKey: "stageMvp" as const },
];

// Derive which filter options actually produce results from the current project set,
// so a dropdown never offers an option that matches no one (see presentSets in board).
function presentMatchOptions(projects: Project[]) {
  return {
    roles: ROLE_OPTIONS.filter((r) => roleFilter(projects, r).length > 0),
    stacks: STACK_OPTIONS.filter((s) => stackFilter(projects, s).length > 0),
    stages: STAGE_OPTIONS.filter((s) => {
      const filtered = stageFilter(projects, s.value);
      return filtered.length > 0;
    }),
  };
}

function stageFilter(projects: Project[], stage: string | undefined): Project[] {
  if (!stage || stage === "any") return projects;
  switch (stage) {
    case "idea":
      return projects.filter((p) => p.status === "planning" || !p.status);
    case "in-progress":
      return projects.filter((p) => p.status === "wip");
    case "mvp":
      return projects.filter((p) => (p.progress ?? 0) >= 75);
    default:
      return projects;
  }
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
    title: `${dict.match.title} · El Umbral`,
    description: dict.match.subtitle,
    alternates: {
      canonical: `/${typed}/match`,
      languages: { en: "/en/match", es: "/es/match", "x-default": "/en/match" },
    },
    openGraph: {
      title: `${dict.match.title} · El Umbral`,
      description: dict.match.subtitle,
      locale: typed === "es" ? "es_VE" : "en_US",
    },
  };
}

export default async function MatchPage({
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
  const mode = one(sp.as) === "sponsor" ? "sponsor" : "builder";
  const base = localePath(locale, "/match");

  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">{dict.nav.match}</p>
        <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight text-text sm:text-4xl">
          {dict.match.title}
        </h1>
        <p className="mt-2 max-w-2xl text-muted">{dict.match.subtitle}</p>
      </header>

      <div className="flex gap-2">
        <Link href={base} className={tab(mode === "builder")}>
          {dict.match.asBuilder}
        </Link>
        <Link href={`${base}?as=sponsor`} className={tab(mode === "sponsor")}>
          {dict.match.asSponsor}
        </Link>
      </div>

      {mode === "builder" ? (
        <BuilderMode base={base} sp={sp} locale={locale} dict={dict} />
      ) : (
        <SponsorMode base={base} sp={sp} locale={locale} dict={dict} />
      )}
    </section>
  );
}

// Eligible projects for each mode: non-live, with a repo, with matching need slots.
function builderEligible(projects: Project[]): Project[] {
  return projects.filter((p) => p.status !== "live" && p.repo_url && p.needs.contributors.length > 0);
}

function sponsorEligible(projects: Project[]): Project[] {
  return projects.filter((p) => p.status !== "live" && (p.needs.api_credits.length > 0 || p.needs.sponsors.length > 0));
}

async function BuilderMode({
  base,
  sp,
  locale,
  dict,
}: {
  base: string;
  sp: SP;
  locale: Locale;
  dict: Dictionary;
}) {
  const q = one(sp.q);
  const role = one(sp.role);
  const profile: MatchProfile = {
    stack: StackInput.parse(many(sp.stack)),
    timezone: one(sp.timezone),
    availability: one(sp.availability),
  };

  const [projects, memberships] = await Promise.all([
    projectRepository.list(),
    membershipRepository.list(),
  ]);

  const teamCount = new Map<string, number>();
  for (const m of memberships) teamCount.set(m.project_slug, (teamCount.get(m.project_slug) ?? 0) + 1);

  // Derive which filter options have results across all projects (not filtered).
  const present = presentMatchOptions(projects);

  // When no filter or profile is active, show all projects instead of applying eligibility.
  const hasFilters = !!(role || profile.stack[0] || profile.timezone || profile.availability);
  const candidatePool = hasFilters ? builderEligible(projects) : projects;
  const byStage = stageFilter(candidatePool, profile.availability);
  const byRole = roleFilter(byStage, role);
  const byStack = stackFilter(byRole, profile.stack[0]);
  const hasProfile = profile.stack.length > 0 || !!profile.timezone || !!profile.availability;
  let matches: ProjectMatch[] = hasProfile
    ? matchProjectsForBuilder(profile, byStack, teamCount)
    : rankProjects(byStack).map((p) => ({ project: p, score: 0, reasons: [] }));

  if (q) {
    const lower = q.toLowerCase();
    matches = matches.filter(
      (m) =>
        m.project.name.toLowerCase().includes(lower) ||
        m.project.summary.toLowerCase().includes(lower) ||
        m.project.stack.some((s) => s.toLowerCase().includes(lower)),
    );
  }

  return (
    <>
      <FilterForm
        base={base}
        current={{ role, stack: profile.stack[0], timezone: profile.timezone, availability: profile.availability, q }}
        groups={[
          { name: "role", label: dict.match.roleLabel, options: present.roles.map((r) => ({ value: r, label: r })) },
          { name: "stack", label: dict.match.stackLabel, options: present.stacks.map((s) => ({ value: s, label: s })) },
          { name: "timezone", label: dict.match.tzLabel, options: TIMEZONE_OPTIONS.map((t) => ({ value: t.replace(/ \(.*\)$/, ""), label: t })) },
          { name: "availability", label: dict.match.stageLabel, options: present.stages.map((s) => ({ value: s.value, label: dict.match[s.labelKey] })) },
        ]}
        allLabel={dict.builders.all}
        applyLabel={dict.board.filters}
        clearLabel={dict.board.clear}
      />

      <form method="get" action={base} role="search" className="flex gap-2 rounded-token border border-border bg-surface p-3">
        <input type="hidden" name="as" value="builder" />
        {[{ n: "role", v: role }, { n: "stack", v: profile.stack[0] }, { n: "timezone", v: profile.timezone }, { n: "availability", v: profile.availability }].filter((x) => x.v).map((x) => (
          <input key={x.n} type="hidden" name={x.n} value={x.v} />
        ))}
        <input type="search" name="q" defaultValue={q} placeholder="Search projects by name or stack…" className="flex-1 rounded-token border border-border bg-surface px-3 py-2 text-sm text-text" aria-label="Search projects" />
        <button type="submit" className="rounded-token bg-primary px-4 py-2 text-sm font-medium text-primary-ink hover:opacity-90">{dict.board.filters}</button>
      </form>

      {matches.length === 0 ? (
        <EmptyState title={dict.match.yourFit} body={dict.match.builderEmpty}>
          <Link
            href={localePath(locale, "/projects/new")}
            className="rounded-token bg-primary px-4 py-2 text-sm font-bold uppercase tracking-widest text-primary-ink hover:opacity-90"
          >
            {dict.match.publishCta}
          </Link>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {matches.length} {dict.match.count}
          </p>
          <ProjectMatchList matches={matches} locale={locale} dict={dict} teamCount={teamCount} />
        </div>
      )}
    </>
  );
}

async function SponsorMode({
  base,
  sp,
  locale,
  dict,
}: {
  base: string;
  sp: SP;
  locale: Locale;
  dict: Dictionary;
}) {
  const offer = OfferInput.parse(one(sp.offer) ?? "");
  const projects = await projectRepository.list();
  const matches: OfferMatch[] = offer
    ? matchProjectsForOffer(offer, projects)
    : rankProjects(sponsorEligible(projects)).map((p) => ({ project: p, score: 0, matched: [] }));

  return (
    <>
      <form
        method="get"
        action={base}
        className="flex flex-wrap items-end gap-3 rounded-token border border-border bg-surface p-4"
      >
        <input type="hidden" name="as" value="sponsor" />
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-muted">
          {dict.match.sponsorLabel}
          <input
            type="text"
            name="offer"
            defaultValue={offer}
            maxLength={80}
            placeholder={dict.match.sponsorPlaceholder}
            className="rounded-token border border-border bg-surface px-3 py-2 text-sm text-text"
          />
        </label>
        <button
          type="submit"
          className="rounded-token bg-primary px-4 py-2 text-sm font-medium text-primary-ink hover:opacity-90"
        >
          {dict.match.sponsorButton}
        </button>
      </form>

      {matches.length === 0 ? (
        <EmptyState title={dict.match.sponsorTitle} body={offer ? dict.match.sponsorEmpty : dict.match.sponsorPrompt} />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {matches.length} {dict.match.count}
          </p>
          <OfferMatchList matches={matches} locale={locale} dict={dict} />
        </div>
      )}
    </>
  );
}
