import { test, expect } from "@playwright/test";

// Pin a phone viewport regardless of the active project so the collapsible nav is
// always under test here — the desktop strip is hidden below lg, the hamburger shows.
test.use({ viewport: { width: 375, height: 812 } });

test.describe("Mobile navigation", () => {
  test("hamburger reveals the nav and a link navigates", async ({ page }) => {
    await page.goto("/en", { waitUntil: "domcontentloaded" });

    const menuButton = page.getByRole("button", { name: "Menu" });
    await expect(menuButton).toBeVisible();

    await menuButton.click();
    const panel = page.locator("#mobile-nav");
    await expect(panel).toBeVisible();

    await panel.getByRole("link", { name: "Board" }).click();
    await expect(page).toHaveURL(/\/en\/board$/);
  });

  test("Escape closes the open menu", async ({ page }) => {
    await page.goto("/en", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.locator("#mobile-nav")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-nav")).toBeHidden();
  });
});
