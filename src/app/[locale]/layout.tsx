import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import type { Locale } from "@/lib/types";
import { isLocale, locales, defaultLocale, getDictionary } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/links";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/layout/SkipLink";

// metadataBase makes every relative metadata URL (canonical, OG, sitemap) resolve
// against the live domain. title.template gives child pages a "Page · El Umbral"
// suffix; the default is the localized app name. Per-page canonical/hreflang live
// on each page (Next merges metadata shallowly, so openGraph set here is inherited
// by pages that don't override it — keep it free of a per-page `url`).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const typed: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = getDictionary(typed);
  return {
    metadataBase: new URL(SITE_URL),
    title: dict.appName,
    description: dict.home.subtitle,
    applicationName: "El Umbral",
    openGraph: {
      type: "website",
      siteName: "El Umbral",
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// This is the ROOT layout (no app/layout.tsx) — it renders <html>/<body> so the
// lang attribute is correct per locale.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typed = locale as Locale;
  const dict = getDictionary(typed);

  return (
    <html lang={typed} className="h-full antialiased">
      <head>
        <link rel="preload" href="/fonts/geist-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="flex min-h-full flex-col overflow-x-clip bg-bg font-sans text-text">
        <SkipLink label={dict.skipToContent} />
        <Header locale={typed} dict={dict} />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <Footer dict={dict} />
      </body>
    </html>
  );
}
