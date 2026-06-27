import { test, expect } from "@playwright/test";
import { BoardPage } from "./pages/BoardPage";

test.describe("Board", () => {
  test("shows project cards in the all view", async ({ page }) => {
    const board = new BoardPage(page);
    await board.goto("en", "?view=all");

    await expect(board.heading).toBeVisible();
    expect(await board.cards.count()).toBeGreaterThan(0);
  });

  test("filtering by status updates the URL and the board stays usable", async ({ page }) => {
    const board = new BoardPage(page);
    await board.goto("en", "?view=all");

    // Pick the first real status option (index 0 is the "All" reset). The select
    // auto-applies via a CLIENT router push, which only fires once React has hydrated
    // its onChange handler — under domcontentloaded nav the select can be set a beat
    // before that. Retry the whole select-then-assert until the navigation lands, so
    // we never race hydration (each selectOption re-dispatches the change event).
    await expect(async () => {
      await board.statusFilter.selectOption({ index: 1 });
      await expect(page).toHaveURL(/status=/, { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });

    await expect(board.heading).toBeVisible(); // never crashes, even if a filter empties the grid
  });

  test("opening a card navigates to its detail page", async ({ page }) => {
    const board = new BoardPage(page);
    await board.goto("en", "?view=all");

    await board.openFirstCardDetail();

    await expect(page).toHaveURL(/\/en\/projects\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
