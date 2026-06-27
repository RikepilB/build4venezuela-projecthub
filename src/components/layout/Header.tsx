import Link from "next/link";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";
import { PROJECTHUB_REPO_URL } from "@/lib/links";

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
            href={localePath(locale, "/resources")}
            className="px-2 py-2 uppercase tracking-widest text-muted hover:text-text"
          >
            {dict.nav.resources}
          </Link>
          <Link
            href={localePath(locale, "/communities")}
            className="px-2 py-2 uppercase tracking-widest text-muted hover:text-text"
          >
            {dict.nav.communities}
          </Link>
          <Link
            href={localePath(locale, "/reference")}
            className="px-2 py-2 uppercase tracking-widest text-muted hover:text-text"
          >
            {dict.nav.reference}
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
          {/* Public repo (MIT) — open in a new tab so visitors can star / fork / PR
              without losing the hub. https-only + rel per the external-links rule. */}
          <a
            href={PROJECTHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label={dict.nav.repo}
            title={dict.nav.repo}
            className="rounded-token border border-border px-2 py-2 text-muted transition hover:text-text"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden className="block">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.02-1.49-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.81.06 1.24.83 1.24.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
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
