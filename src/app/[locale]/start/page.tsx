import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale } from "@/lib/i18n/config";
import { socialPreview } from "@/lib/social-preview";
import { quickCopy } from "@/lib/workspace/quick-copy";
import { WorkspaceApp } from "@/components/workspace/WorkspaceApp";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const typed = isLocale(locale) ? locale : defaultLocale;
  const copy = quickCopy[typed];
  return {
    title: `${typed === "es" ? "Inicio rápido" : "Quick start"} · ProjectHub · El Umbral`,
    description: copy.description,
    alternates: { canonical: `/${typed}/start`, languages: { en: "/en/start", es: "/es/start", "x-default": "/es/start" } },
    openGraph: { title: copy.title, description: copy.description, images: [socialPreview(typed)], locale: typed === "es" ? "es_VE" : "en_US" },
  };
}

export default async function QuickStartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = quickCopy[locale];
  return <div className="space-y-8">
    <header className="grid gap-7 border-b border-border pb-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="max-w-2xl"><p className="eyebrow">{copy.eyebrow}</p><h1 className="mt-3 text-balance font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{copy.title}</h1><p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{copy.description}</p></div>
      <ol className="flex flex-col justify-center gap-4 text-sm">{copy.steps.map((step, index) => <li key={step} className="flex items-start gap-3"><span className="font-mono text-primary">0{index + 1}</span><span>{step}</span></li>)}</ol>
    </header>
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <WorkspaceApp locale={locale} quickStart />
      <aside className="space-y-7 text-sm leading-relaxed">
        {[[copy.localTitle, copy.localBody], [copy.handoffTitle, copy.handoffBody], [copy.limitsTitle, copy.limitsBody]].map(([title, body]) => <section key={title} className="border-l-2 border-primary/50 pl-4"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-muted">{body}</p></section>)}
        <Link href={`/${locale}/workspace`} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">{copy.continue} →</Link>
      </aside>
    </div>
  </div>;
}
