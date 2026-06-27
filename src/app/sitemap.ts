import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/links";
import { locales } from "@/lib/i18n/config";
import { projectRepository } from "@/lib/repository";

// Lives at the app root (not under [locale]) so it serves at /sitemap.xml. The
// locale proxy skips dotted paths, so this is reachable without a redirect.
//
// Indexable, content-bearing routes only — one entry per locale, each with
// hreflang alternates so Google pairs the en/es versions. /search (query-driven)
// and /projects/new (a form) are intentionally excluded; project detail pages are
// enumerated from the repository so every published project is discoverable.
const STATIC_PATHS = [
  "", // home
  "/board",
  "/builders",
  "/ecosystem",
  "/resources",
  "/communities",
  "/reference",
] as const;

function languagesFor(path: string): Record<string, string> {
  return Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`]));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    STATIC_PATHS.map((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified,
      changeFrequency: path === "" ? "daily" : "weekly",
      priority: path === "" ? 1 : 0.7,
      alternates: { languages: languagesFor(path) },
    })),
  );

  const projects = await projectRepository.list();
  const projectEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    projects.map((p) => ({
      url: `${SITE_URL}/${locale}/projects/${p.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      alternates: { languages: languagesFor(`/projects/${p.slug}`) },
    })),
  );

  return [...staticEntries, ...projectEntries];
}
