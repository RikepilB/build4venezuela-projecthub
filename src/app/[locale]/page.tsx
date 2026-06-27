import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";
import { projectRepository, builderRepository, membershipRepository } from "@/lib/repository";
import { landingStats, featuredProjects } from "@/lib/landing/stats";
import { SearchBox } from "@/components/search/SearchBox";
import { ProjectCard } from "@/components/board/ProjectCard";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { BUILD4VENEZUELA_URL, VZLA_RESPONSE_HUB_URL } from "@/lib/links";

// Render live per request, not prerendered at build. The headline stats (builders,
// projects, live, needs) come from runtime data — the roster grows via self-adds
// (Redis on Vercel) and the board accepts new projects — so a static snapshot would
// freeze the counts at build time and drift from the dynamic /builders and /board
// pages (e.g. landing shows 49 builders while the roster already has 57). Keep this
// in sync with those pages; the repository reads are cheap (~100-250ms).
export const dynamic = "force-dynamic";

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

  const statItems = [
    { value: stats.projects, label: dict.landing.statProjects },
    { value: stats.builders, label: dict.landing.statBuilders },
    { value: stats.live, label: dict.landing.statLive },
    { value: stats.needs, label: dict.landing.statNeeds },
  ];

  return (
    <div className="flex flex-col gap-20 py-12">
      {/* Hero — search-first, true to "search before you build". */}
      <section className="flex flex-col gap-7">
        <p className="eyebrow">{dict.appName}</p>
        <h1 className="max-w-3xl text-4xl font-extrabold uppercase leading-none tracking-tight text-text sm:text-6xl">
          {dict.home.title}
        </h1>
        <p className="max-w-xl text-muted">{dict.home.subtitle}</p>
        <div className="max-w-xl">
          <SearchBox
            locale={locale}
            placeholder={dict.home.placeholder}
            button={dict.home.searchButton}
            autoFocus
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={localePath(locale, "/board")}
            className="rounded-token border border-border px-4 py-2 text-sm font-bold uppercase tracking-widest text-text hover:border-primary hover:text-primary"
          >
            {dict.home.browseButton} →
          </Link>
          <Link
            href={localePath(locale, "/projects/new")}
            className="rounded-token bg-primary px-4 py-2 text-sm font-bold uppercase tracking-widest text-primary-ink hover:opacity-90"
          >
            {dict.landing.publishCta}
          </Link>
        </div>
      </section>

      {/* Live stats — real counts from the repositories (thin brutalist grid lines
          come from gap-px over a bg-border parent). */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-token border border-border bg-border sm:grid-cols-4">
        {statItems.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 bg-surface p-5">
            <span className="text-3xl font-extrabold text-primary sm:text-4xl">{s.value}</span>
            <span className="text-xs uppercase tracking-widest text-muted">{s.label}</span>
          </div>
        ))}
      </section>

      {/* What is ProjectHub */}
      <section className="flex flex-col gap-4">
        <p className="eyebrow">{dict.home.whatTitle}</p>
        <p className="max-w-2xl text-muted">{dict.home.whatBody}</p>
      </section>

      {/* Crisis response hubs — umbrella hubs beyond this board (the hackathon itself and
          a citizen-built emergency hub). External, https-only via ExternalLink (safe rel). */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">{dict.landing.hubsEyebrow}</p>
          <h2 className="text-2xl font-extrabold uppercase tracking-tight text-text">
            {dict.landing.hubsTitle}
          </h2>
          <p className="max-w-2xl text-muted">{dict.landing.hubsBody}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-token border border-border bg-surface p-6">
            <p className="text-2xl font-extrabold text-text">{dict.landing.hackathonName}</p>
            <p className="text-sm text-muted">{dict.landing.hackathonBody}</p>
            <div className="mt-auto pt-1">
              <ExternalLink href={BUILD4VENEZUELA_URL} className="text-sm font-medium">
                {dict.landing.hackathonCta}
              </ExternalLink>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-token border border-border bg-surface p-6">
            <p className="text-2xl font-extrabold text-text">{dict.landing.responseHubName}</p>
            <p className="text-sm text-muted">{dict.landing.responseHubBody}</p>
            <p className="text-xs uppercase tracking-wide text-muted">{dict.landing.responseHubOffers}</p>
            <div className="mt-auto pt-1">
              <ExternalLink href={VZLA_RESPONSE_HUB_URL} className="text-sm font-medium">
                {dict.landing.responseHubCta}
              </ExternalLink>
            </div>
          </div>
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

      {/* How it works */}
      <section className="flex flex-col gap-5">
        <p className="eyebrow">{dict.home.howTitle}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="rounded-token border border-border bg-surface p-4">
              <p className="font-semibold uppercase tracking-wide text-text">{s.title}</p>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Builders + ecosystem teasers */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-token border border-border bg-surface p-6">
          <p className="eyebrow">{dict.nav.builders}</p>
          <p className="text-2xl font-extrabold text-text">
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
        <div className="flex flex-col gap-3 rounded-token border border-border bg-surface p-6">
          <p className="eyebrow">{dict.nav.ecosystem}</p>
          <p className="text-2xl font-extrabold text-text">
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

      {/* Final CTA band */}
      <section className="rounded-token bg-primary p-8 text-primary-ink">
        <p className="text-xs font-bold uppercase tracking-widest">{dict.tagline}</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-extrabold uppercase leading-tight tracking-tight sm:text-3xl">
          {dict.landing.ctaTitle}
        </h2>
        <p className="mt-3 max-w-xl text-sm font-medium">{dict.landing.ctaBody}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={localePath(locale, "/projects/new")}
            className="rounded-token bg-primary-ink px-4 py-2 text-sm font-bold uppercase tracking-widest text-primary hover:opacity-90"
          >
            {dict.landing.ctaPublish}
          </Link>
          <Link
            href={localePath(locale, "/board")}
            className="rounded-token border border-primary-ink/30 px-4 py-2 text-sm font-bold uppercase tracking-widest hover:bg-primary-ink/10"
          >
            {dict.landing.ctaBrowse}
          </Link>
        </div>
      </section>
    </div>
  );
}
