import type { Locale } from "../types";
import { en } from "./en";
import { es } from "./es";

export const locales: Locale[] = ["en", "es"];
// Venezuela-first relief app → Spanish is the default entry. The proxy redirects
// "/" (and any unprefixed path) here; the header language toggle still reaches /en.
export const defaultLocale: Locale = "es";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, es };

export function isLocale(value: string): value is Locale {
  return (locales as string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
