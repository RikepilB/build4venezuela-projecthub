import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Martian_Mono } from "next/font/google";
import "../globals.css";
import type { Locale } from "@/lib/types";
import { isLocale, locales, getDictionary } from "@/lib/i18n/config";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/layout/SkipLink";

// Narrow brutalist mono — the campaign font (Input Mono Narrow) is paid; this is
// the closest free Google equivalent. Used for the whole UI, per the brand.
const mono = Martian_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Build4Venezuela · ProjectHub",
  description: "Search before you build — discover relief projects, join or publish.",
};

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
    <html lang={typed} className={`${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg font-mono text-text">
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
