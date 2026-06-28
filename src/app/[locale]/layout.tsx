import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Martian_Mono, Fraunces } from "next/font/google";
import "../globals.css";
import type { Locale } from "@/lib/types";
import { isLocale, locales, defaultLocale, getDictionary } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/links";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/layout/SkipLink";

// Narrow mono — body, UI and data. Closest free equivalent to the campaign's
// paid Input Mono Narrow; the terminal half of the El Umbral type system.
const mono = Martian_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

// Fraunces — editorial high-contrast serif for the wordmark and hero headings.
// The "threshold" voice against the mono: considered, literary, human.
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

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
    <html lang={typed} className={`${mono.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col overflow-x-clip bg-bg font-mono text-text">
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
