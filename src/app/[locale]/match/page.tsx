import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { isLocale, getDictionary, type Dictionary } from "@/lib/i18n/config";
import type { Locale } from "@/lib/types";
import { builderRepository, membershipRepository, projectRepository } from "@/lib/repository";
import { FilterForm } from "@/components/ui/FilterForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { localePath } from "@/lib/i18n/href";
import { builderFilterOptions } from "@/lib/builders/filter";
import { matchProjectsForBuilder, matchProjectsForOffer } from "@/lib/match/score";
import { ProjectMatchList } from "@/components/match/ProjectMatchList";
import { OfferMatchList } from "@/components/match/OfferMatchList";
import type { MatchProfile } from "@/lib/match/types";

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
  const profile: MatchProfile = {
    stack: StackInput.parse(many(sp.stack)),
    timezone: one(sp.timezone),
    availability: one(sp.availability),
  };

  const [allBuilders, projects, memberships] = await Promise.all([
    builderRepository.list(),
    projectRepository.list(),
    membershipRepository.list(),
  ]);
  const options = builderFilterOptions(allBuilders);

  const teamCount = new Map<string, number>();
  for (const m of memberships) teamCount.set(m.project_slug, (teamCount.get(m.project_slug) ?? 0) + 1);

  const hasProfile = profile.stack.length > 0 || !!profile.timezone || !!profile.availability;
  const matches = hasProfile ? matchProjectsForBuilder(profile, projects, teamCount) : [];

  return (
    <>
      <FilterForm
        base={base}
        current={{ stack: profile.stack[0], timezone: profile.timezone, availability: profile.availability }}
        groups={[
          { name: "stack", label: dict.builders.stack, options: options.stack.map((s) => ({ value: s, label: s })) },
          { name: "timezone", label: dict.builders.timezone, options: options.timezone.map((t) => ({ value: t, label: t })) },
          { name: "availability", label: dict.builders.availability, options: options.availability.map((a) => ({ value: a, label: a })) },
        ].filter((g) => g.options.length > 0)}
        allLabel={dict.builders.all}
        applyLabel={dict.board.filters}
        clearLabel={dict.board.clear}
      />

      {!hasProfile ? (
        <EmptyState title={dict.match.yourFit} body={dict.match.builderPrompt} />
      ) : matches.length === 0 ? (
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
  const matches = offer ? matchProjectsForOffer(offer, projects) : [];

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

      {!offer ? (
        <EmptyState title={dict.match.sponsorTitle} body={dict.match.sponsorPrompt} />
      ) : matches.length === 0 ? (
        <EmptyState title={dict.match.sponsorTitle} body={dict.match.sponsorEmpty} />
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
