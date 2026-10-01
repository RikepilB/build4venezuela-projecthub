import { test, expect } from "@playwright/test";

const SITE_ORIGIN = "https://elumbralvzla.org";
const IMAGE_VERSION = "workspace-v2";
const crawlerHeaders = { "User-Agent": "Twitterbot/1.0", Accept: "text/html" };
const routes = [
  "", "board", "workspace", "start", "builders", "resources", "communities",
  "ecosystem", "reference", "search", "match", "projects/new",
];

function decodeAttribute(value: string) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
    const named: Record<string, string> = {
      "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">",
    };
    const lower = entity.toLowerCase();
    if (named[lower]) return named[lower];
    return String.fromCodePoint(
      lower.startsWith("&#x") ? parseInt(lower.slice(3, -1), 16) : parseInt(lower.slice(2, -1), 10),
    );
  });
}

function attributes(tag: string) {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    result[match[1].toLowerCase()] = decodeAttribute(match[2] ?? match[3]);
  }
  return result;
}

function metaValues(html: string, key: string) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map(([tag]) => attributes(tag))
    .filter((tag) => tag.property === key || tag.name === key)
    .map((tag) => tag.content);
}

function assertShareMetadata(html: string, locale: string) {
  const expectedImage = `${SITE_ORIGIN}/${locale}/opengraph-image/${IMAGE_VERSION}`;
  const ogImages = metaValues(html, "og:image");
  const twitterImages = metaValues(html, "twitter:image");
  expect(ogImages).toEqual([expectedImage]);
  expect(twitterImages).toEqual(ogImages);

  const imageUrl = new URL(ogImages[0]);
  expect(imageUrl.origin).toBe(SITE_ORIGIN);
  expect(imageUrl.protocol).toBe("https:");
  expect(imageUrl.username).toBe("");
  expect(imageUrl.password).toBe("");
  expect(imageUrl.hash).toBe("");
  expect(metaValues(html, "og:image:width")).toEqual(["1200"]);
  expect(metaValues(html, "og:image:height")).toEqual(["630"]);
  expect(metaValues(html, "twitter:card")).toEqual(["summary_large_image"]);

  const imageAlt = metaValues(html, "og:image:alt");
  expect(imageAlt).toHaveLength(1);
  expect(imageAlt[0]).toContain("El Umbral");
  expect(imageAlt[0]).toContain("ProjectHub");
  expect(metaValues(html, "twitter:image:alt")).toEqual(imageAlt);
}

function firstProjectPath(html: string, locale: string, testOrigin: string) {
  for (const [tag] of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attributes(tag).href;
    if (!href) continue;
    const url = new URL(href, testOrigin);
    if (
      url.origin === testOrigin &&
      new RegExp(`^/${locale}/projects/[^/]+$`).test(url.pathname) &&
      url.pathname !== `/${locale}/projects/new`
    ) return url.pathname;
  }
  throw new Error(`No real project detail link found in the ${locale} board HTML`);
}

test.describe("Social share preview", () => {
  for (const locale of ["es", "en"]) {
    test(`serves the current ${locale} card to crawlers on public routes`, async ({ request, baseURL }, testInfo) => {
      // These assertions inspect HTTP responses; viewport repetition adds no coverage.
      test.skip(testInfo.project.name !== "chromium", "Crawler metadata does not depend on the browser viewport");
      test.setTimeout(120_000);
      expect(baseURL).toBeTruthy();
      const testOrigin = new URL(baseURL!).origin;
      let projectPath = "";

      for (const route of routes) {
        const pathname = `/${locale}${route ? `/${route}` : ""}`;
        await test.step(`crawler metadata: ${pathname}`, async () => {
          const url = new URL(pathname, testOrigin);
          if (route === "board") url.searchParams.set("view", "all");
          const response = await request.get(url.href, { headers: crawlerHeaders });
          expect(response.status()).toBe(200);
          expect(response.headers()["content-type"]).toContain("text/html");
          const html = await response.text();
          assertShareMetadata(html, locale);
          if (route === "board") projectPath = firstProjectPath(html, locale, testOrigin);
        });
      }

      await test.step("crawler metadata: a real project from the board", async () => {
        expect(projectPath).not.toBe("");
        const response = await request.get(new URL(projectPath, testOrigin).href, { headers: crawlerHeaders });
        expect(response.status()).toBe(200);
        assertShareMetadata(await response.text(), locale);
      });

      await test.step("the versioned image is a public 1200 by 630 PNG", async () => {
        // Metadata must use the canonical domain, but local runs must inspect this build's image.
        const imageUrl = new URL(`/${locale}/opengraph-image/${IMAGE_VERSION}`, testOrigin);
        // Cached HTML from the previous release can still request the unversioned URL.
        const legacy = await request.get(new URL(`/${locale}/opengraph-image`, testOrigin).href, { maxRedirects: 0 });
        expect(legacy.status()).toBe(308);
        expect(new URL(legacy.headers().location, testOrigin).href).toBe(imageUrl.href);
        const response = await request.get(imageUrl.href, { headers: { "User-Agent": crawlerHeaders["User-Agent"] } });
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toMatch(/^image\/png(?:;|$)/);
        const png = await response.body();
        expect(png.length).toBeGreaterThan(24);
        expect(png.length).toBeLessThan(5 * 1024 * 1024);
        expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        expect(png.toString("ascii", 12, 16)).toBe("IHDR");
        expect(png.readUInt32BE(16)).toBe(1200);
        expect(png.readUInt32BE(20)).toBe(630);
      });
    });
  }
});
