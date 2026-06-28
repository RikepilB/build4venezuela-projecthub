import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/types";
import { isLocale, defaultLocale, getDictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";
import { projectRepository, builderRepository, membershipRepository } from "@/lib/repository";
import { landingStats, featuredProjects } from "@/lib/landing/stats";
import { SearchBox } from "@/components/search/SearchBox";
import { ProjectCard } from "@/components/board/ProjectCard";
import { UserGuide } from "@/components/home/UserGuide";
import { BUILD4VENEZUELA_URL, VZLA_RESPONSE_HUB_URL } from "@/lib/links";

// Render live per request, not prerendered at build. The headline stats (builders,
// projects, live, needs) come from runtime data — the roster grows via self-adds
// (Redis on Vercel) and the board accepts new projects — so a static snapshot would
// freeze the counts at build time and drift from the dynamic /builders and /board
// pages (e.g. landing shows 49 builders while the roster already has 57). Keep this
// in sync with those pages; the repository reads are cheap (~100-250ms).
export const dynamic = "force-dynamic";

// Home is the canonical entry point and the most-shared URL, so it carries an
// explicit self-canonical plus en/es hreflang (x-default → en). Other pages
// inherit metadataBase + OG from the root layout and self-canonicalize; their
// hreflang pairing is supplied by the sitemap.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const typed: Locale = isLocale(locale) ? locale : defaultLocale;
  return {
    alternates: {
      canonical: `/${typed}`,
      languages: { en: "/en", es: "/es", "x-default": "/en" },
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  // Server component → read the repositories directly (one ranked read each) so the
  // landing page shows real counts and the actual top projects, not placeholders.
  const [projects, builders, memberships] = await Promise.all([
    projectRepository.list(),
    builderRepository.list(),
    membershipRepository.list(),
  ]);
  const stats = landingStats(projects, builders);
  const featured = featuredProjects(projects, 3);

  const teamCounts = new Map<string, number>();
  for (const m of memberships) {
    teamCounts.set(m.project_slug, (teamCounts.get(m.project_slug) ?? 0) + 1);
  }

  const steps = [
    { title: dict.home.step1Title, body: dict.home.step1Body },
    { title: dict.home.step2Title, body: dict.home.step2Body },
    { title: dict.home.step3Title, body: dict.home.step3Body },
  ];

  // The Quick Guide is a map of the app — one row per section, each linking to it.
  const guideSections = [
    { href: localePath(locale, "/board"), label: dict.nav.board, body: dict.guide.board },
    { href: localePath(locale, "/ecosystem"), label: dict.nav.shipped, body: dict.guide.ecosystem },
    { href: localePath(locale, "/builders"), label: dict.nav.builders, body: dict.guide.builders },
    { href: localePath(locale, "/resources"), label: dict.nav.resources, body: dict.guide.resources },
    { href: localePath(locale, "/reference"), label: dict.nav.reference, body: dict.guide.reference },
    { href: localePath(locale, "/communities"), label: dict.nav.communities, body: dict.guide.communities },
  ];

  const statItems = [
    { value: stats.projects, label: dict.landing.statProjects },
    { value: stats.builders, label: dict.landing.statBuilders },
    { value: stats.live, label: dict.landing.statLive },
    { value: stats.needs, label: dict.landing.statNeeds },
  ];

  return (
    <div className="flex flex-col gap-20">
      {/* ── HERO — the threshold. Full-bleed dusk, warm amber light spilling through
          the doorway; search stays prominent. One orchestrated staggered reveal,
          each child offset by inline animation-delay (reduced-motion → no movement). */}
      <section className="bleed relative -mt-8 flex min-h-[82svh] items-center justify-center overflow-hidden border-b border-border">
        <div aria-hidden className="threshold-glow pointer-events-none absolute inset-0" />
        <div aria-hidden className="grain pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-24">
          <p className="rise eyebrow" style={{ animationDelay: "0ms" }}>
            {dict.appName}
          </p>
          <h1
            className="rise max-w-3xl text-balance font-display text-5xl font-semibold leading-[1.03] tracking-tight text-text sm:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            {dict.home.title}
          </h1>
          <p className="rise max-w-xl text-muted" style={{ animationDelay: "160ms" }}>
            {dict.home.subtitle}
          </p>
          {/* the lit doorway: amber-ringed frame around the search */}
          <div
            className="doorway rise max-w-xl rounded-token bg-bg/40 p-1.5"
            style={{ animationDelay: "240ms" }}
          >
            <SearchBox
              locale={locale}
              placeholder={dict.home.placeholder}
              button={dict.home.searchButton}
            />
          </div>
          <div
            className="rise flex flex-wrap items-center gap-3"
            style={{ animationDelay: "320ms" }}
          >
            <Link
              href={localePath(locale, "/match")}
              className="rounded-token bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-primary-ink hover:opacity-90"
            >
              {dict.home.matchButton} →
            </Link>
            <Link
              href={localePath(locale, "/board")}
              className="rounded-token border border-border px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-text hover:border-primary hover:text-primary"
            >
              {dict.home.browseButton} →
            </Link>
          </div>
          {/* Quick guide — a one-line disclosure that expands into a map of the app
              (one row per section, each a link). No modal, no auto-open. */}
          <div className="rise" style={{ animationDelay: "380ms" }}>
            <UserGuide label={dict.guide.open} intro={dict.guide.intro} sections={guideSections} />
          </div>
          <p
            className="rise mt-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted"
            style={{ animationDelay: "420ms" }}
            aria-hidden
          >
            <span className="text-accent">↓</span> {dict.home.scrollCue}
          </p>
        </div>
      </section>

      {/* Live stats — real counts from the repositories (thin grid lines from gap-px
          over a bg-border parent); numerals in the editorial serif, in amber. */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-token border border-border bg-border sm:grid-cols-4">
        {statItems.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 bg-surface p-5">
            <span className="font-display text-4xl font-semibold text-primary sm:text-5xl">
              {s.value}
            </span>
            <span className="text-xs uppercase tracking-widest text-muted">{s.label}</span>
          </div>
        ))}
      </section>

      {/* What is El Umbral — one editorial breath in the serif. */}
      <section className="flex flex-col gap-5">
        <p className="eyebrow">{dict.home.whatTitle}</p>
        <p className="max-w-3xl font-display text-xl leading-snug text-text sm:text-2xl">
          {dict.home.whatBody}
        </p>
      </section>

      {/* Crisis response hubs — the wider relief response beyond this board (the hackathon
          itself + a citizen-built emergency hub). Given visual weight: amber-accented
          feature cards, the whole card is the link. External, https-only + safe rel. */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">{dict.landing.hubsEyebrow}</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            {dict.landing.hubsTitle}
          </h2>
          <p className="max-w-2xl text-muted">{dict.landing.hubsBody}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <a
            href={BUILD4VENEZUELA_URL}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group relative flex flex-col gap-3 overflow-hidden rounded-token border border-border bg-surface p-7 transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-[0_0_44px_-12px_var(--b4v-glow-strong)]"
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-primary" />
            <div className="flex items-start justify-between gap-3">
              <p className="font-display text-2xl font-semibold text-text">{dict.landing.hackathonName}</p>
              <span aria-hidden className="text-lg text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                ↗
              </span>
            </div>
            <p className="text-sm text-muted">{dict.landing.hackathonBody}</p>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-bold uppercase tracking-widest text-primary">
              {dict.landing.hackathonCta} →
            </span>
          </a>
          <a
            href={VZLA_RESPONSE_HUB_URL}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group relative flex flex-col gap-3 overflow-hidden rounded-token border border-border bg-surface p-7 transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-[0_0_44px_-12px_var(--b4v-glow-strong)]"
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-primary" />
            <div className="flex items-start justify-between gap-3">
              <p className="font-display text-2xl font-semibold text-text">{dict.landing.responseHubName}</p>
              <span aria-hidden className="text-lg text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                ↗
              </span>
            </div>
            <p className="text-sm text-muted">{dict.landing.responseHubBody}</p>
            <div className="flex flex-wrap gap-1.5">
              {dict.landing.responseHubOffers.split(" · ").map((offer) => (
                <span
                  key={offer}
                  className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted"
                >
                  {offer}
                </span>
              ))}
            </div>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-bold uppercase tracking-widest text-primary">
              {dict.landing.responseHubCta} →
            </span>
          </a>
        </div>
      </section>

      {/* Featured — top-ranked buildable projects, reusing the board card. */}
      {featured.length > 0 && (
        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <p className="eyebrow">{dict.landing.featuredTitle}</p>
              <p className="max-w-2xl text-muted">{dict.landing.featuredBody}</p>
            </div>
            <Link href={localePath(locale, "/board")} className="eyebrow hover:text-text">
              {dict.landing.featuredCta} →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                locale={locale}
                dict={dict}
                teamCount={teamCounts.get(p.slug) ?? 0}
              />
            ))}
          </div>
        </section>
      )}

      {/* How it works — three steps strung on a hairline, titles in the serif. */}
      <section className="flex flex-col gap-5">
        <p className="eyebrow">{dict.home.howTitle}</p>
        <div className="grid gap-px overflow-hidden rounded-token border border-border bg-border sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="flex flex-col gap-2 bg-surface p-6">
              <p className="font-display text-xl font-semibold text-primary">{s.title}</p>
              <p className="text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Builders + ecosystem teasers */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-token border border-border bg-surface p-6 transition-colors hover:border-primary/40">
          <p className="eyebrow">{dict.nav.builders}</p>
          <p className="font-display text-2xl font-semibold text-text">
            {stats.builders} {dict.landing.statBuilders}
          </p>
          <p className="text-sm text-muted">{dict.landing.buildersBody}</p>
          <Link
            href={localePath(locale, "/builders")}
            className="mt-auto text-sm font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
          >
            {dict.landing.buildersCta} →
          </Link>
        </div>
        <div className="flex flex-col gap-3 rounded-token border border-border bg-surface p-6 transition-colors hover:border-primary/40">
          <p className="eyebrow">{dict.nav.ecosystem}</p>
          <p className="font-display text-2xl font-semibold text-text">
            {stats.live} {dict.landing.statLive}
          </p>
          <p className="text-sm text-muted">{dict.landing.ecosystemBody}</p>
          <Link
            href={localePath(locale, "/ecosystem")}
            className="mt-auto text-sm font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
          >
            {dict.landing.ecosystemCta} →
          </Link>
        </div>
      </section>

    </div>
  );
}
