import { type Page, type Locator } from "@playwright/test";

// Page Object for El Umbral Match (/[locale]/match). Builder mode reuses the shared
// FilterForm (a "Stack" <select>); sponsor mode is a plain GET form (input[name=offer]).
export class MatchPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly stackFilter: Locator;
  readonly matchCards: Locator;
  readonly offerInput: Locator;
  readonly offerCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.stackFilter = page.getByLabel("Stack");
    this.matchCards = page.getByTestId("match-card");
    this.offerInput = page.locator('input[name="offer"]');
    this.offerCards = page.getByTestId("offer-card");
  }

  async goto(locale: "en" | "es" = "en", query = "") {
    // force-dynamic route → DOM-ready is enough; assertions auto-wait on elements.
    await this.page.goto(`/${locale}/match${query}`, { waitUntil: "domcontentloaded" });
  }

  sponsorTab(): Locator {
    return this.page.getByRole("link", { name: "I can sponsor" });
  }

  findProjectsButton(): Locator {
    return this.page.getByRole("button", { name: "Find projects" });
  }
}
