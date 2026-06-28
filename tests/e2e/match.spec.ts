import { test, expect } from "@playwright/test";
import { MatchPage } from "./pages/MatchPage";
import { BoardPage } from "./pages/BoardPage";

// El Umbral Match — the golden feature. Unit tests (tests/unit/match-*) prove the
// scoring; these prove the three flows wire up end-to-end and never crash, even when a
// filter empties the grid.
test.describe("Match", () => {
  test("builder mode prompts, then responds to a stack pick", async ({ page }) => {
    const match = new MatchPage(page);
    await match.goto("en");

    await expect(match.heading).toBeVisible();
    await expect(match.stackFilter).toBeVisible();

    // Pick the first real stack (index 0 = the "All" reset). The select auto-applies via
    // a CLIENT router push that only fires after hydration — retry until the URL lands,
    // exactly as the board filter test does.
    await expect(async () => {
      await match.stackFilter.selectOption({ index: 1 });
      await expect(page).toHaveURL(/stack=/, { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });

    await expect(match.heading).toBeVisible(); // usable even if nothing matches that stack

    // When projects do match, each card carries its "why you fit" reasons strip.
    if ((await match.matchCards.count()) > 0) {
      await expect(match.matchCards.first().getByTestId("match-reasons")).toBeVisible();
    }
  });

  test("sponsor mode matches an offer against project needs", async ({ page }) => {
    const match = new MatchPage(page);
    await match.goto("en", "?as=sponsor");

    await expect(match.offerInput).toBeVisible();
    await match.offerInput.fill("hosting");
    await match.findProjectsButton().click();

    await expect(page).toHaveURL(/as=sponsor&offer=hosting/);
    // The seed has several projects asking for "Hosting" → at least one match.
    await expect(match.offerCards.first()).toBeVisible();
  });

  test("a recruiting project shows the Recruit panel on its detail page", async ({ page }) => {
    // Filter the board to projects with open contributor needs, so the first card is
    // guaranteed to render the recruit panel on its detail page.
    const board = new BoardPage(page);
    await board.goto("en", "?view=all&need=contributors");
    await board.openFirstCardDetail();

    await expect(page).toHaveURL(/\/en\/projects\/[^/]+$/);
    await expect(page.getByTestId("recruit-panel")).toBeVisible();
  });
});
