import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale } from "@/lib/i18n/config";

// Next 16 "proxy" convention (formerly middleware).
// NOT a security boundary (cf. CVE-2025-29927) — this only rewrites locale
// prefixes. Any future auth/ownership checks MUST live in the data/service layer
// (server actions + repository), never here.
// Redirect any non-locale-prefixed path (incl. "/") to the default locale so
// [locale] stays the single top route segment and its layout is the root layout.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocale) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, API routes, and any file with an extension.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
