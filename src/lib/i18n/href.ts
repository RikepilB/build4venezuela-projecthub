import type { Locale } from "../types";

// Locale-prefixed internal path. Use for every internal <Link>.
export function localePath(locale: Locale, path = ""): string {
  return `/${locale}${path}`;
}
