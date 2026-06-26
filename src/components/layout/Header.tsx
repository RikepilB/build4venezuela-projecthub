import Link from "next/link";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const other: Locale = locale === "en" ? "es" : "en";
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href={localePath(locale)} className="font-semibold tracking-tight text-text">
          {dict.appName}
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-3" aria-label="Primary">
          <Link href={localePath(locale, "/board")} className="rounded-token px-2 py-1.5 text-muted hover:text-text">
            {dict.nav.board}
          </Link>
          <Link href={localePath(locale, "/builders")} className="rounded-token px-2 py-1.5 text-muted hover:text-text">
            {dict.nav.builders}
          </Link>
          <Link
            href={localePath(locale, "/projects/new")}
            className="rounded-token bg-primary px-3 py-1.5 font-medium text-primary-ink hover:opacity-90"
          >
            {dict.nav.submit}
          </Link>
          <Link
            href={localePath(other)}
            className="rounded-token border border-border px-2 py-1.5 font-semibold uppercase text-muted hover:text-text"
            aria-label={`Switch language to ${other === "en" ? "English" : "Español"}`}
          >
            {other}
          </Link>
        </nav>
      </div>
    </header>
  );
}
