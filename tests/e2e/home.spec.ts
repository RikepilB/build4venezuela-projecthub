import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/HomePage";

// Landing is the search-first entry point and is force-dynamic (live counts).
// These cover that it renders in both locales and that search routes correctly.
test.describe("Landing", () => {
  test("renders in English with the search box and live stats", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto("en");

    await expect(home.heading).toBeVisible();
    await expect(home.search).toBeVisible();
    await expect(home.searchInput).toBeVisible();
  });

  test("renders the Spanish locale", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto("es");

    await expect(home.heading).toBeVisible();
    await expect(page).toHaveURL(/\/es$/);
    expect(await page.locator("html").getAttribute("lang")).toBe("es");
  });

  test("search submits to /search with the query", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto("en");
    await home.searchFor("mapa");

    await expect(page).toHaveURL(/\/en\/search\?q=mapa/);
  });
});
