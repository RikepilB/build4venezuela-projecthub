import Link from "next/link";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const other: Locale = locale === "en" ? "es" : "en";
  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href={localePath(locale)} className="flex items-center gap-2.5">
          <span aria-hidden className="text-xs leading-none tracking-[0.3em]">
            <span className="text-primary">★</span>
            <span className="text-danger">★</span>
            <span className="text-accent">★</span>
          </span>
          <span className="font-extrabold uppercase tracking-tight text-text">
            Build4Venezuela <span className="text-muted">/ Hub</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-xs sm:gap-2" aria-label="Primary">
          <Link
            href={localePath(locale, "/board")}
            className="px-2 py-2 uppercase tracking-widest text-muted hover:text-text"
          >
            {dict.nav.board}
          </Link>
          <Link
            href={localePath(locale, "/ecosystem")}
            className="px-2 py-2 uppercase tracking-widest text-muted hover:text-text"
          >
            {dict.nav.ecosystem}
          </Link>
          <Link
            href={localePath(locale, "/builders")}
            className="px-2 py-2 uppercase tracking-widest text-muted hover:text-text"
          >
            {dict.nav.builders}
          </Link>
          <Link
            href={localePath(locale, "/projects/new")}
            className="rounded-token bg-primary px-3 py-2 font-bold uppercase tracking-widest text-primary-ink hover:opacity-90"
          >
            {dict.nav.submit}
          </Link>
          <Link
            href={localePath(other)}
            className="rounded-token border border-border px-2 py-2 font-bold uppercase tracking-widest text-muted hover:text-text"
            aria-label={`Switch language to ${other === "en" ? "English" : "Español"}`}
          >
            {other}
          </Link>
        </nav>
      </div>
    </header>
  );
}
