import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/lib/i18n/config";
import { communityRepository } from "@/lib/repository";
import { CommunityCard } from "@/components/communities/CommunityCard";
import { EmptyState } from "@/components/ui/EmptyState";

// Communities directory — public, durable coordination spaces (Discord, the hackathon
// hub, Telegram directories). Distinct from the board (build), ecosystem (use) and
// resources (verified link-outs): this is "where to join and talk to people".
export default async function CommunitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const communities = await communityRepository.list();

  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">{dict.nav.communities}</p>
        <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-tight text-text sm:text-4xl">
          {dict.communities.title}
        </h1>
        <p className="mt-2 max-w-2xl text-muted">{dict.communities.subtitle}</p>
      </header>

      <p className="text-sm text-muted">
        {communities.length} {dict.communities.count}
      </p>

      {communities.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((c) => (
            <CommunityCard key={c.id} community={c} dict={dict} />
          ))}
        </div>
      ) : (
        <EmptyState title={dict.communities.empty} />
      )}
    </section>
  );
}
