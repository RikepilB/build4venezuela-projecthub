import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/lib/i18n/config";
import { projectRepository } from "@/lib/repository";
import { SubmitProjectForm } from "@/components/project/SubmitProjectForm";
import { ExistingMatches } from "@/components/search/ExistingMatches";

export default async function NewProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ prefill?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const sp = await searchParams;
  const prefill = typeof sp.prefill === "string" ? sp.prefill : "";
  // "Search before you build" nudge: show similar projects above the form.
  const similar = prefill ? (await projectRepository.search(prefill)).slice(0, 4) : [];

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text">{dict.submit.title}</h1>
        <p className="mt-1 text-muted">{dict.submit.subtitle}</p>
      </header>

      {similar.length > 0 && (
        <div className="rounded-token border border-border bg-surface-2 p-4">
          <p className="mb-3 text-sm font-medium text-text">{dict.submit.similarHint}</p>
          <ExistingMatches hits={similar} locale={locale} dict={dict} />
        </div>
      )}

      <SubmitProjectForm locale={locale} dict={dict} prefillName={prefill} />
    </section>
  );
}
