import { type Page, type Locator } from "@playwright/test";

// Page Object for the locale landing page (/[locale]). Selectors are accessible
// (role/label) so they survive styling/markup churn — no brittle CSS classes.
export class HomePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly search: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.search = page.getByRole("search");
    this.searchInput = this.search.getByRole("searchbox");
  }

  async goto(locale: "en" | "es" = "en") {
    // Resolve on DOM-ready, not the full "load" event: the landing is force-dynamic
    // and image/font-heavy, so under cold parallel load "load" can exceed the nav
    // timeout. Every assertion here auto-waits on its element, so DOM-ready is enough.
    await this.page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
  }

  // The header's primary nav link to a route, by its visible (uppercase) label.
  navLink(name: RegExp | string): Locator {
    return this.page.getByRole("link", { name });
  }

  async searchFor(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press("Enter");
  }
}
