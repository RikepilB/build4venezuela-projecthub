import { test, expect, type Page } from "@playwright/test";

async function openNavigation(page: Page, isMobile: boolean, locale: "en" | "es" = "en") {
  const name = isMobile ? (locale === "en" ? "Menu" : "Menú") : (locale === "en" ? "My workspace: More" : "Mi espacio: Más");
  const trigger = page.getByRole("button", { name, exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  return trigger;
}

test("locale switching keeps the workspace route and event context", async ({ page, isMobile }) => {
  await page.goto("/es/workspace?event=community-weekend&focus=water-directory", { waitUntil: "domcontentloaded" });
  if (isMobile) await openNavigation(page, isMobile, "es");
  const language = page.getByRole("link", { name: "Switch language to English", exact: true });
  await expect(language).toHaveAttribute("href", "/en/workspace?event=community-weekend&focus=water-directory");
  await language.click();
  await expect(page).toHaveURL(/\/en\/workspace\?event=community-weekend&focus=water-directory$/);
  if (isMobile) await openNavigation(page, isMobile);
  await expect(page.getByRole("link", { name: "Switch language to Español", exact: true }))
    .toHaveAttribute("href", "/es/workspace?event=community-weekend&focus=water-directory");
});

test("quick start is discoverable and Escape returns focus to its navigation disclosure", async ({ page, isMobile }) => {
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  const trigger = await openNavigation(page, isMobile);
  const quickStart = page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Quick start", exact: true });
  await expect(quickStart).toHaveAttribute("href", "/en/start");
  await quickStart.focus();
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await trigger.click();
  await quickStart.click();
  await expect(page).toHaveURL(/\/en\/start$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("successive filter changes retain live controls, view and URL-only filters", async ({ page, isMobile }) => {
  await page.goto("/en/board?view=all&priority=high&stack=React", { waitUntil: "domcontentloaded" });
  // A working disclosure confirms hydration before dispatching the rapid changes.
  await openNavigation(page, isMobile);
  await page.keyboard.press("Escape");
  const form = page.locator("form").filter({ has: page.locator('select[name="category"]') });
  const chosen = await form.evaluate((element) => {
    const category = element.querySelector<HTMLSelectElement>('select[name="category"]')!;
    const status = element.querySelector<HTMLSelectElement>('select[name="status"]')!;
    category.value = category.options[1].value;
    category.dispatchEvent(new Event("change", { bubbles: true }));
    status.value = status.options[1].value;
    status.dispatchEvent(new Event("change", { bubbles: true }));
    return { category: category.value, status: status.value };
  });
  await expect(page).toHaveURL((url) => Object.entries({ ...chosen, view: "all", priority: "high", stack: "React" })
    .every(([name, value]) => url.searchParams.get(name) === value));
  await expect(form.locator('select[name="category"]')).toHaveValue(chosen.category);
  await expect(form.locator('select[name="status"]')).toHaveValue(chosen.status);
  await form.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("priority") === "high" && url.searchParams.get("stack") === "React");
  await form.locator('select[name="category"]').selectOption("");
  await expect(page).toHaveURL((url) => !url.searchParams.has("category") && url.searchParams.get("status") === chosen.status && url.searchParams.get("priority") === "high");
});

for (const locale of ["en", "es"] as const) {
  for (const failure of ["rejected", "transport"] as const) {
    test(`${locale} vote ${failure} failure remains retryable with accessible feedback`, async ({ page, isMobile }) => {
      let intercepted = 0;
      // No POST reaches the server: these cases are also safe against production.
      await page.route("**/*", async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        intercepted += 1;
        if (failure === "transport") return route.abort("failed");
        return route.fulfill({
          status: 200,
          contentType: "text/x-component",
          body: '0:{"a":"$@1","f":[],"b":"test"}\n1:{"ok":false}\n',
        });
      });
      await page.goto(`/${locale}/board?view=all`, { waitUntil: "domcontentloaded" });
      await openNavigation(page, isMobile, locale);
      await page.keyboard.press("Escape");
      const card = page.getByRole("article").first();
      const button = card.getByRole("button", { name: locale === "en" ? "Upvote — prioritize this" : "Votar — prioriza esto", exact: true });
      const error = locale === "en" ? "Your vote could not be saved. Please try again." : "No se pudo guardar tu voto. Inténtalo de nuevo.";
      await button.click();
      await expect(card.getByRole("alert")).toHaveText(error);
      await expect(button).toBeEnabled();
      await expect(button).toHaveAccessibleDescription(error);
      expect(intercepted).toBe(1);
      await page.reload({ waitUntil: "domcontentloaded" });
      await openNavigation(page, isMobile, locale);
      await page.keyboard.press("Escape");
      await expect(button).toBeEnabled();
      await button.click();
      await expect(card.getByRole("alert")).toHaveText(error);
      await expect(button).toBeEnabled();
      expect(intercepted).toBe(2);
    });
  }
}
