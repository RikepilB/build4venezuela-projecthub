import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/links";

// Serves at /robots.txt (app root, dotted path → skipped by the locale proxy).
// Fully crawlable: this is a public discovery hub. Points crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
