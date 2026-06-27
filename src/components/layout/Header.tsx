import Link from "next/link";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";
import { PROJECTHUB_REPO_URL } from "@/lib/links";
import { MobileNav } from "./MobileNav";

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const other: Locale = locale === "en" ? "es" : "en";
  const langAria = `Switch language to ${other === "en" ? "English" : "Español"}`;

  // One source of truth for the primary routes — the desktop strip (md+) and the
  // mobile disclosure both render from this list.
  const navItems = [
    { href: localePath(locale, "/board"), label: dict.nav.board },
    { href: localePath(locale, "/ecosystem"), label: dict.nav.ecosystem },
    { href: localePath(locale, "/resources"), label: dict.nav.resources },
    { href: localePath(locale, "/communities"), label: dict.nav.communities },
    { href: localePath(locale, "/reference"), label: dict.nav.reference },
    { href: localePath(locale, "/builders"), label: dict.nav.builders },
  ];

  return (
    <header className="relative border-b border-border bg-bg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Link href={localePath(locale)} className="group flex items-center gap-2.5">
          {/* Doorway mark — a lit threshold: peaked frame in ivory, the panel
              glowing amber. The one memorable element of the El Umbral mark. */}
          <span aria-hidden className="text-text">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" className="block">
              <path
                d="M4 22V8.2L12 3l8 5.2V22"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <rect x="9.6" y="13" width="4.8" height="9" rx="0.5" className="fill-primary" />
            </svg>
          </span>
          <span className="font-display text-xl font-semibold leading-none tracking-tight text-text">
            El Umbral
          </span>
        </Link>

        {/* Desktop nav — full strip on md+. Below md it collapses into MobileNav. */}
        <nav className="hidden items-center gap-1 text-xs md:flex lg:gap-2" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-2 py-2 uppercase tracking-widest text-muted hover:text-text"
            >
              {item.label}
            </Link>
          ))}
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
            aria-label={langAria}
          >
            {other}
          </Link>
        </nav>

        {/* Phone disclosure — same routes, collapsed behind a hamburger. */}
        <MobileNav
          items={navItems}
          submit={{ href: localePath(locale, "/projects/new"), label: dict.nav.submit }}
          repo={{ href: PROJECTHUB_REPO_URL, label: dict.nav.repo }}
          lang={{ href: localePath(other), label: other, aria: langAria }}
          menuLabel={dict.nav.menu}
          closeLabel={dict.nav.close}
        />
      </div>
    </header>
  );
}
