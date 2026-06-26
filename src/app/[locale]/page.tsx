import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/lib/i18n/config";
import { SearchBox } from "@/components/search/SearchBox";
import { localePath } from "@/lib/i18n/href";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-12 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
        {dict.home.title}
      </h1>
      <p className="text-balance text-muted">{dict.home.subtitle}</p>
      <SearchBox
        locale={locale}
        placeholder={dict.home.placeholder}
        button={dict.home.searchButton}
        autoFocus
      />
      <Link
        href={localePath(locale, "/board")}
        className="text-sm font-medium text-primary hover:underline"
      >
        {dict.home.browseButton} →
      </Link>
    </section>
  );
}
