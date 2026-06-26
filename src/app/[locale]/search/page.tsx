import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/lib/i18n/config";
import { projectRepository } from "@/lib/repository";
import { SearchBox } from "@/components/search/SearchBox";
import { ExistingMatches } from "@/components/search/ExistingMatches";
import { EmptyState } from "@/components/ui/EmptyState";
import { localePath } from "@/lib/i18n/href";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const hits = q ? await projectRepository.search(q) : [];

  return (
    <section className="flex flex-col gap-6">
      <SearchBox
        locale={locale}
        placeholder={dict.home.placeholder}
        button={dict.home.searchButton}
        defaultValue={q}
      />

      {q ? (
        <p className="text-sm text-muted">
          {dict.search.resultsFor} <span className="font-medium text-text">{q}</span>
        </p>
      ) : null}

      {hits.length > 0 ? (
        <>
          <ExistingMatches hits={hits} locale={locale} dict={dict} />
          <div className="rounded-token border border-border bg-surface-2 p-4 text-center">
            <Link
              href={localePath(locale, `/projects/new?prefill=${encodeURIComponent(q)}`)}
              className="font-medium text-primary hover:underline"
            >
              {dict.search.publishCta} →
            </Link>
          </div>
        </>
      ) : q ? (
        <EmptyState title={dict.search.noMatchTitle} body={dict.search.noMatchBody}>
          <Link
            href={localePath(locale, `/projects/new?prefill=${encodeURIComponent(q)}`)}
            className="rounded-token bg-primary px-4 py-2 text-sm font-medium text-primary-ink hover:opacity-90"
          >
            {dict.search.publishCta}
          </Link>
        </EmptyState>
      ) : null}
    </section>
  );
}
