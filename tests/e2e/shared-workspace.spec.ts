import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

// UI error/recovery tests use controlled API responses. Database permission tests
// independently execute database/workspaces.sql in PostgreSQL, not these fixtures.
function sharedFixture(role: "owner" | "editor" | "viewer" = "owner") {
  return {
    workspace: { id: randomUUID(), name: "Shared test event", mode: "rapid", objective: "Build together", deadline: "", updatedAt: new Date().toISOString(),
      projects: [{ id: randomUUID(), name: "Team project", goal: "Useful prototype", repoUrl: "", demoUrl: "", submissionUrl: "", deliverables: [{ id: randomUUID(), title: "Test the prototype", done: false }],
        tasks: [{ id: randomUUID(), title: "Build prototype", owner: "Alex", status: "doing", priority: "high", dueAt: "", blocker: "" }] }] },
    revision: 1, role, userId: randomUUID(), updatedAt: new Date().toISOString(), members: [], invitations: [], activity: [],
  };
}

test("viewer sees work and exports it without edit controls", async ({ page }) => {
  const data = sharedFixture("viewer");
  await page.route(`**/api/workspaces/${data.workspace.id}`, (route) => route.fulfill({ json: { data } }));
  await page.goto(`/en/workspace/${data.workspace.id}`);
  await expect(page.getByRole("heading", { name: "Shared test event", exact: true })).toBeVisible();
  await expect(page.getByText("Build prototype", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add task +" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Event settings" })).toHaveCount(0);
  await expect(page.getByLabel("Status: Build prototype")).toBeDisabled();
  await expect(page.getByLabel("Test the prototype")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Export backup" })).toBeVisible();
  const width = await page.evaluate(() => ({ body: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(width.body).toBeLessThanOrEqual(width.viewport);
});

test("shared stale saves keep unsaved input and refresh the saved work", async ({ page }) => {
  const data = sharedFixture("editor");
  await page.route(`**/api/workspaces/${data.workspace.id}`, async (route) => {
    if (route.request().method() === "POST") {
      data.revision = 2;
      data.workspace.projects[0].tasks[0].status = "done";
      return route.fulfill({ status: 409, json: { error: "conflict" } });
    }
    return route.fulfill({ json: { data } });
  });
  await page.goto(`/en/workspace/${data.workspace.id}`);
  await page.getByRole("button", { name: "Edit task: Build prototype" }).click();
  await page.getByLabel("Owner", { exact: true }).fill("Unsaved owner");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("newer version");
  await expect(page.getByLabel("Owner", { exact: true })).toHaveValue("Unsaved owner");
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("region", { name: "Done", exact: true })).toContainText("Build prototype");
});

test("invitation is consumed from the fragment and joins without leaving a URL secret", async ({ page }) => {
  const data = sharedFixture("editor");
  const token = "b".repeat(64);
  let joined = false;
  await page.route(`**/api/workspaces/${data.workspace.id}`, async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({ action: "join", token, label: "María" });
      joined = true;
    }
    return route.fulfill({ json: { data } });
  });
  await page.goto(`/es/workspace/${data.workspace.id}#token=${token}`);
  await expect(page.getByRole("heading", { name: "Unirse a un espacio compartido" })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await page.getByLabel("Tu nombre en este espacio").fill("María");
  await page.getByRole("button", { name: "Unirme al espacio", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Shared test event" })).toBeVisible();
  expect(joined).toBe(true);
});

test("owner creates an invitation and confirms participant removal", async ({ page }) => {
  const data = sharedFixture();
  const member = { userId: randomUUID(), label: "Teammate", role: "editor" };
  const members = [member];
  const mutations: string[] = [];
  await page.route(`**/api/workspaces/${data.workspace.id}`, async (route) => {
    let token;
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      mutations.push(body.action);
      if (body.action === "invite") token = "c".repeat(64);
      if (body.action === "remove_member") members.splice(0, members.length);
    }
    return route.fulfill({ json: { data: { ...data, members }, token } });
  });
  await page.goto(`/en/workspace/${data.workspace.id}`);
  await page.getByText("Team access", { exact: true }).click();
  await page.getByRole("combobox", { name: "Invitation permission" }).selectOption("viewer");
  await page.getByRole("button", { name: "Create invitation", exact: true }).click();
  await expect(page.getByText("Single-use link, valid for 7 days. Send it only to the intended participant.")).toBeVisible();
  await page.getByRole("button", { name: "Remove access: Teammate" }).click();
  expect(mutations).toEqual(["invite"]);
  await page.getByRole("button", { name: "Remove access", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove access: Teammate" })).toHaveCount(0);
  expect(mutations).toEqual(["invite", "remove_member"]);
});

test("temporary server failure leaves the task form intact", async ({ page }) => {
  const data = sharedFixture("editor");
  await page.route(`**/api/workspaces/${data.workspace.id}`, async (route) => {
    if (route.request().method() === "POST") return route.fulfill({ status: 503, json: { error: "unavailable" } });
    return route.fulfill({ json: { data } });
  });
  await page.goto(`/en/workspace/${data.workspace.id}`);
  await page.getByRole("button", { name: "Add task +" }).click();
  await page.getByLabel("What needs to happen?").fill("Preserve my draft");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByLabel("What needs to happen?")).toHaveValue("Preserve my draft");
});
