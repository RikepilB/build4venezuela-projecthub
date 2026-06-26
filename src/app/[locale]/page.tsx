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

  const steps = [
    { title: dict.home.step1Title, body: dict.home.step1Body },
    { title: dict.home.step2Title, body: dict.home.step2Body },
    { title: dict.home.step3Title, body: dict.home.step3Body },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-16 py-16">
      <section className="flex flex-col gap-7">
        <p className="eyebrow">{dict.appName}</p>
        <h1 className="text-4xl font-extrabold uppercase leading-none tracking-tight text-text sm:text-6xl">
          {dict.home.title}
        </h1>
        <p className="max-w-xl text-muted">{dict.home.subtitle}</p>
        <SearchBox
          locale={locale}
          placeholder={dict.home.placeholder}
          button={dict.home.searchButton}
          autoFocus
        />
        <Link href={localePath(locale, "/board")} className="eyebrow hover:text-text">
          {dict.home.browseButton} →
        </Link>
      </section>

      <section className="flex flex-col gap-4">
        <p className="eyebrow">{dict.home.whatTitle}</p>
        <p className="max-w-2xl text-muted">{dict.home.whatBody}</p>
      </section>

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
    </div>
  );
}
