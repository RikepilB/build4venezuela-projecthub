import { type Page, type Locator } from "@playwright/test";

// Page Object for the project board (/[locale]/board). The board renders one
// <article> per project card; filters are <select>s labelled by their group name.
export class BoardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly cards: Locator;
  readonly statusFilter: Locator;
  readonly categoryFilter: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.cards = page.locator("article");
    this.statusFilter = page.getByLabel("Status");
    this.categoryFilter = page.getByLabel("Category");
  }

  async goto(locale: "en" | "es" = "en", query = "") {
    // DOM-ready, not full "load": the board renders many cards (images) and is
    // force-dynamic, so "load" can exceed the nav timeout under cold parallel load.
    // Assertions auto-wait on their elements, so DOM-ready suffices.
    await this.page.goto(`/${locale}/board${query}`, { waitUntil: "domcontentloaded" });
  }

  // The high-priority ↔ all segmented toggle.
  showAllLink(): Locator {
    return this.page.getByRole("link", { name: /Show all/ });
  }

  // The first card's upvote control (aria-label = the vote dictionary string).
  firstVoteButton(): Locator {
    return this.cards.first().getByRole("button", { name: /Upvote/ });
  }

  // The count inside the first card's upvote control. Server-authoritative, so it
  // updates only after the vote action's revalidatePath refresh lands.
  firstVoteCount(): Locator {
    return this.cards.first().getByTestId("vote-count");
  }

  // The card for a specific project slug, identified by its detail link. Stable
  // across re-ranking — votes are the primary sort key, so voting reshuffles the
  // grid and "first card" is no longer the card you voted.
  cardBySlug(slug: string): Locator {
    return this.cards.filter({ has: this.page.locator(`a[href$="/projects/${slug}"]`) });
  }

  async openFirstCardDetail() {
    // The card title is a link to /projects/[slug]; click it to reach the detail page.
    await this.cards.first().getByRole("link").first().click();
  }
}
