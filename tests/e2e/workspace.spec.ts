import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function createEvent(page: Page, name = "Community Build Weekend") {
  await page.goto("/en/workspace");
  await page.getByLabel("Hackathon name").fill(name);
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

async function createProject(page: Page) {
  await page.getByRole("button", { name: "Add project +", exact: true }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Water directory");
  await page.getByLabel(/What will you deliver/).fill("A tested directory of verified water points");
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Water directory", exact: true })).toBeVisible();
}

test("tracks owners, blockers, deadlines and progress across reloads without mixing events", async ({ page }) => {
  await createEvent(page);
  await createProject(page);
  await page.getByRole("button", { name: "Add task +" }).click();
  await page.getByLabel("What needs to happen?").fill("Verify the source list");
  await page.getByLabel("Owner", { exact: true }).fill("Alex");
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("blocked");
  await page.getByLabel("Due date").fill("2020-01-01T12:00");
  await page.getByLabel("What is blocking this?").fill("Waiting for coordinator review");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  const task = page.getByRole("article").filter({ hasText: "Verify the source list" });
  await expect(task).toContainText("Alex");
  await expect(task).toContainText("Waiting for coordinator review");
  await expect(task).toContainText("Overdue");
  await task.getByLabel("Status: Verify the source list").selectOption("done");
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
  await page.reload();
  await expect(page.getByRole("region", { name: "Done", exact: true })).toContainText("Verify the source list");
  await expect(task).not.toContainText("Overdue");
  await page.getByRole("button", { name: "New hackathon +" }).click();
  await page.getByLabel("Hackathon name").fill("Another event");
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Make room for your first idea" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Water directory" })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Hackathon", exact: true }).selectOption({ label: "Community Build Weekend" });
  await expect(page.getByRole("heading", { name: "Water directory" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Needs attention" }).check();
  await expect(page.getByText("No tasks match this view.")).toBeVisible();
});

test("exports and imports a separate backup, preserves checklist state and rejects invalid files", async ({ page }) => {
  await createEvent(page);
  await createProject(page);
  // The checkbox reflects confirmed persistence, which completes asynchronously.
  await page.getByLabel("Choose one useful outcome").click();
  await expect(page.getByLabel("Choose one useful outcome")).toBeChecked();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const content = JSON.parse(await readFile(path!, "utf8"));
  expect(content.version).toBe(1);
  expect(content.workspace.projects[0].deliverables[0].done).toBe(true);
  await page.getByLabel("Import workspace", { exact: true }).setInputFiles(path!);
  await page.getByRole("button", { name: "Import as a new workspace" }).click();
  await expect(page.getByRole("combobox", { name: "Hackathon", exact: true }).locator("option")).toHaveCount(2);
  await expect(page.getByLabel("Choose one useful outcome")).toBeChecked();
  await page.getByRole("button", { name: "Project details", exact: true }).click();
  await page.getByLabel("Checklist item 1", { exact: true }).fill("Verify the final demo");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByLabel("Verify the final demo")).toBeChecked();
  await page.getByLabel("Import workspace", { exact: true }).setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"version":2}') });
  await expect(page.getByRole("main").getByRole("alert")).toContainText("not a valid ProjectHub");
  await expect(page.getByRole("combobox", { name: "Hackathon", exact: true }).locator("option")).toHaveCount(2);
});

test("protects unsaved task edits when another tab changes the same task", async ({ page, context }) => {
  await createEvent(page);
  await createProject(page);
  await page.getByRole("button", { name: "Add task +" }).click();
  await page.getByLabel("What needs to happen?").fill("Build prototype");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByRole("button", { name: "Edit task: Build prototype" }).click();
  await page.getByLabel("Owner", { exact: true }).fill("First tab");
  const other = await context.newPage();
  await other.goto("/en/workspace");
  await other.getByLabel("Status: Build prototype").selectOption("done");
  await expect(other.getByRole("progressbar")).toHaveAttribute("value", "1");
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("changed in another tab");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("region", { name: "Done", exact: true })).toContainText("Build prototype");
});

test("shows a recoverable error when browser storage cannot save", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "projecthub.workspaces.v1") throw new DOMException("Quota exceeded", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.goto("/en/workspace");
  await page.getByLabel("Hackathon name").fill("Unsaved workspace");
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Could not save");
  await expect(page.getByLabel("Hackathon name")).toHaveValue("Unsaved workspace");
  await expect(page.getByRole("button", { name: "Export backup" })).toHaveCount(0);
});

test("Spanish crisis setup and event editing work at small widths", async ({ page }) => {
  await page.goto("/es/workspace");
  await page.getByLabel("Nombre del hackathon").fill("Encuentro comunitario");
  await page.getByRole("radio", { name: "Respuesta a crisis" }).check();
  await page.getByRole("button", { name: "Crear espacio", exact: true }).click();
  await page.getByRole("button", { name: "Ajustes del evento" }).click();
  await page.getByLabel("¿Qué quieres lograr?").fill("Construir una herramienta comunitaria");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Construir una herramienta comunitaria")).toBeVisible();
  await page.getByRole("button", { name: "Añadir proyecto +" }).click();
  await page.getByLabel("Nombre del proyecto").fill("Directorio local");
  await page.getByRole("button", { name: "Añadir proyecto", exact: true }).click();
  await expect(page.getByLabel("Identificar responsable y realizar el traspaso")).toBeVisible();
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

test("connects a catalog project to a local workspace without changing the public project", async ({ page }) => {
  await page.goto("/en/board?view=all");
  const card = page.locator("article").first();
  const name = await card.getByRole("link").first().innerText();
  await card.getByRole("link", { name: "Start from this project" }).click();
  await expect(page).toHaveURL(/\/en\/workspace\?project=/);
  await page.getByLabel("Hackathon name").fill("My next hackathon");
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(name);
  await expect(page.getByText("This creates your own local plan.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
});
