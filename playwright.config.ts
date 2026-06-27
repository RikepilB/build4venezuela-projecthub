import { defineConfig, devices } from "@playwright/test";

// E2E config. Specs live in tests/e2e/*.spec.ts (vitest owns tests/unit + tests/
// integration via *.test.ts, so the two runners never collide). Two projects —
// desktop Chrome and a Pixel viewport — so the mobile-responsive work (collapsible
// nav, single-column grids) is exercised on a real small viewport, not just asserted.
//
// The webServer runs a PRODUCTION build (`next build && next start`), not `next dev`,
// on purpose: dev compiles routes on first hit, so a parallel worker fan-out hammers a
// cold server and routes time out under the compile stampede. A prebuilt server serves
// precompiled routes instantly, which is what makes the suite deterministic. Reused if
// a server is already up locally; CI always builds fresh.
const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry even locally: the suite shares a single server, so the odd transient
  // (a navigation ERR_ABORTED, a client-router push that lands a beat late under load)
  // shouldn't fail the run. Cap workers below the default 8 for the same reason —
  // fewer concurrent hits keep the one server responsive.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: `${baseURL}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
