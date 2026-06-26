import taxonomy from "../../data/taxonomy.json";
import type { Locale } from "./types";

export interface TaxItem {
  id: string;
  en: string;
  es: string;
}

export const categories = taxonomy.categories as TaxItem[];
export const statuses = taxonomy.statuses as TaxItem[];
export const needTypes = taxonomy.needTypes as TaxItem[];
export const stacks = taxonomy.stacks as string[];

export function labelFor(items: TaxItem[], id: string, locale: Locale): string {
  const item = items.find((i) => i.id === id);
  return item ? item[locale] : id;
}
