import { test, expect } from "@playwright/test";
import { BoardPage } from "./pages/BoardPage";

// Guards the documented invariant: vote counts are server-authoritative — the UI
// must NOT add an optimistic client +1 (that would double-count). So a single click
// locks the button (one vote per browser) and persists exactly +1 server-side, which
// a reload then reflects — never +2.
test.describe("Upvote", () => {
  test("upvoting locks the button and persists exactly +1", async ({ page }, testInfo) => {
    // Voting is viewport-independent (mobile coverage lives in the nav/board/home specs),
    // so run this on ONE project only. Both projects share a single server + votes.json;
    // the local JSON store does a whole-file read-modify-write with no lock, so two
    // browsers voting concurrently lose updates (prod uses atomic Redis INCR — no race).
    // Running once removes that harness-induced race and makes the +1 assertion exact.
    test.skip(testInfo.project.name !== "chromium", "single-project: avoid concurrent votes.json writes");

    const board = new BoardPage(page);
    await board.goto("en", "?view=all");

    const card = board.cards.first();

    // Pin the exact card by slug: voting bumps it up the (votes-first) ranking, so the
    // card at this index after a reload may be a different card. Slug stays put.
    const href = await card.getByRole("link").first().getAttribute("href");
    const slug = (href ?? "").split("/").pop() ?? "";
    expect(slug).not.toBe("");

    const voteBtn = card.getByRole("button", { name: /Upvote/ });
    await expect(voteBtn).toBeEnabled();
    const before = Number((await card.getByTestId("vote-count").innerText()).trim()) || 0;

    await voteBtn.click();
    // The guard locks the control as soon as the write is confirmed — the user's
    // immediate "it registered" feedback.
    await expect(voteBtn).toBeDisabled();

    // The cross-reload guard is the localStorage flag, written once the awaited server
    // action confirms the write — it lands a beat AFTER the button disables (the form
    // transition disables it immediately). Wait for the flag to actually persist before
    // reloading, or the reload races the write and the guard can't re-disable.
    await expect
      .poll(() => page.evaluate((s) => localStorage.getItem(`vote:${s}`), slug), { timeout: 10_000 })
      .toBe("1");

    // Reload and re-find THAT card by slug: its persisted count is server-authoritative
    // and exactly +1 (no optimistic bump → never +2), and the per-browser guard keeps
    // the control locked.
    await page.reload();
    const sameCard = board.cardBySlug(slug);
    await expect(sameCard.getByTestId("vote-count")).toHaveText(String(before + 1));
    await expect(sameCard.getByRole("button", { name: /Upvote/ })).toBeDisabled();
  });
});
