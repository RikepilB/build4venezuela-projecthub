import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { WorkspaceFileSchema } from "../../src/lib/workspace/schema";

async function createQuickProject(page: Page, projectName = "Water directory", eventName?: string) {
  await page.goto("/en/start", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Project name", { exact: true }).fill(projectName);
  if (eventName) {
    await page.getByText("Event, timing and task owner", { exact: true }).click();
    await page.getByLabel("Hackathon name", { exact: true }).fill(eventName);
  }
  await page.getByRole("button", { name: "Create my project plan", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/workspace\?event=[^&]+&focus=/);
  await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible();
}

async function downloadText(page: Page, name: string) {
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  const download = await waiting;
  const path = await download.path();
  expect(path).not.toBeNull();
  return { text: await readFile(path!, "utf8"), filename: download.suggestedFilename(), path: path! };
}

async function projectBackup(page: Page, label = "Download project backup") {
  const { text } = await downloadText(page, label);
  return WorkspaceFileSchema.parse(JSON.parse(text));
}

test("a name creates one complete starter workspace and reloads at the selected project", async ({ page }) => {
  await createQuickProject(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quick hackathon");
  await expect(page.getByRole("region", { name: "To do", exact: true }).getByRole("article")).toHaveCount(3);
  await expect(page.getByRole("region", { name: "Delivery checklist", exact: true }).getByRole("checkbox")).toHaveCount(3);
  await expect(page.getByRole("progressbar")).toHaveAttribute("max", "3");
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0");
  await page.getByText("Share context and handoff", { exact: true }).click();
  const { workspace } = await projectBackup(page);
  expect(workspace.projects).toHaveLength(1);
  expect(workspace.mode).toBe("rapid");
  expect(workspace.deadline).toBe("");
  expect(workspace.projects[0].goal).toBe("");
  expect(workspace.projects[0].tasks).toHaveLength(3);
  expect(workspace.projects[0].tasks.every((task) => task.status === "todo" && task.owner === "")).toBe(true);
  expect(workspace.projects[0].deliverables.every((item) => !item.done)).toBe(true);
  const selected = new URL(page.url());
  expect(selected.searchParams.get("event")).toBe(workspace.id);
  expect(selected.searchParams.get("focus")).toBe(workspace.projects[0].id);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Water directory", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Hackathon", exact: true }).locator("option")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "To do", exact: true }).getByRole("article")).toHaveCount(3);
});

test("optional outcome, context, owner and relative deadline survive the handoff", async ({ page }) => {
  await page.goto("/en/start", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Project name", { exact: true }).fill("Clinic map");
  await page.getByLabel(/What will you deliver/).fill("A verified map for the coordinator");
  await page.getByLabel(/Project context/).fill("Source verified by Ana\nOnly include locations approved by the coordinator");
  await page.getByRole("combobox", { name: /How are you starting/ }).selectOption("planned");
  await page.getByText("Event, timing and task owner", { exact: true }).click();
  await page.getByLabel("Hackathon name", { exact: true }).fill("Community weekend");
  await page.getByRole("combobox", { name: "Time available", exact: true }).selectOption("6");
  await page.getByLabel(/Owner/).fill("Ana");
  await page.getByRole("button", { name: "Create my project plan", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Community weekend");
  await expect(page.getByRole("heading", { name: "Clinic map", exact: true })).toBeVisible();
  await page.getByText("Share context and handoff", { exact: true }).click();
  const { workspace } = await projectBackup(page);
  expect(workspace.mode).toBe("planned");
  expect(workspace.objective).toBe("A verified map for the coordinator");
  expect(workspace.projects[0].goal).toBe(workspace.objective);
  expect(workspace.projects[0].context).toBe("Source verified by Ana\nOnly include locations approved by the coordinator");
  expect(workspace.projects[0].tasks.every((task) => task.owner === "Ana")).toBe(true);
  expect(Date.parse(workspace.deadline) - Date.parse(workspace.updatedAt)).toBe(6 * 3_600_000);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Project details", exact: true }).click();
  await expect(page.getByLabel(/Project context/)).toHaveValue(workspace.projects[0].context!);
});

test("a second quick start preserves event selection across reload and browser back", async ({ page, isMobile }) => {
  await createQuickProject(page, "First project", "First weekend");
  const firstUrl = page.url();
  await createQuickProject(page, "Second project", "Second weekend");
  const secondUrl = page.url();
  expect(secondUrl).not.toBe(firstUrl);
  const events = page.getByRole("combobox", { name: "Hackathon", exact: true });
  await expect(events.locator("option")).toHaveCount(2);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Second project", exact: true })).toBeVisible();
  await events.selectOption({ label: "First weekend" });
  await expect(page).toHaveURL(firstUrl);
  await expect(page.getByRole("heading", { name: "First project", exact: true })).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "First weekend", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "First project", exact: true })).toBeVisible();
  await events.selectOption({ label: "Second weekend" });
  await expect(page).toHaveURL(secondUrl);
  await expect(page.getByRole("heading", { name: "Second project", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add project +", exact: true }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Second event side project");
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Second event side project", exact: true })).toBeVisible();
  const projects = page.getByRole("navigation", { name: "Projects", exact: true });
  await projects.getByRole("button", { name: /^Second project/ }).click();
  await projects.getByRole("button", { name: /^Second event side project/ }).click();
  const selectedUrl = page.url();
  await page.getByRole("button", { name: isMobile ? "Menu" : "My workspace: More", exact: true }).click();
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Quick start", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/start$/);
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(selectedUrl);
  await expect(page.getByRole("heading", { name: "Second weekend", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Second event side project", exact: true })).toBeVisible();
});

test("handoff downloads reflect current context, tasks and checklist while excluding other projects", async ({ page }) => {
  await createQuickProject(page);
  await page.getByRole("button", { name: "Add project +", exact: true }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Another team project");
  await page.getByLabel(/Project context/).fill("Other project context must stay out of this handoff");
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Another team project", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Projects", exact: true }).getByRole("button", { name: /Water directory/ }).click();
  const selectedProject = new URL(page.url()).searchParams.get("focus");
  await page.getByRole("button", { name: "Project details", exact: true }).click();
  await page.getByLabel(/Project context/).fill("Verified by Ana\nNext shift reviews coverage");
  await page.getByLabel("Demo URL", { exact: true }).fill("https://example.com/water-demo");
  await page.getByLabel("Checklist item 1", { exact: true }).fill("Coordinator reviewed the source");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("combobox", { name: "Status: Choose one useful outcome", exact: true }).selectOption("done");
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
  await page.getByRole("button", { name: "Edit task: Build and test the smallest version", exact: true }).click();
  await page.getByLabel("Owner", { exact: true }).fill("Ana");
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("blocked");
  await page.getByLabel("What is blocking this?", { exact: true }).fill("Waiting for coordinator review");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("region", { name: "Blocked", exact: true })).toContainText("Waiting for coordinator review");
  const checklist = page.getByRole("checkbox", { name: "Coordinator reviewed the source", exact: true });
  await checklist.click();
  await expect(checklist).toBeChecked();
  await page.getByText("Share context and handoff", { exact: true }).click();
  const preview = await page.getByLabel("Project handoff preview", { exact: true }).inputValue();
  expect(preview).toContain("Verified by Ana\nNext shift reviews coverage");
  expect(preview).toContain("- [x] Choose one useful outcome");
  expect(preview).toContain("Status: Blocked");
  expect(preview).toContain("Owner: Ana");
  expect(preview).toContain("Waiting for coordinator review");
  expect(preview).toContain("- [x] Coordinator reviewed the source");
  expect(preview).toContain("https://example.com/water-demo");
  expect(preview).not.toContain("Another team project");
  expect(preview).not.toContain("Other project context");
  const markdown = await downloadText(page, "Download Markdown");
  expect(markdown.filename).toMatch(/\.md$/);
  expect(markdown.text).toBe(preview);
  const selectedDownload = await downloadText(page, "Download project backup");
  const { workspace } = WorkspaceFileSchema.parse(JSON.parse(selectedDownload.text));
  expect(workspace.projects).toHaveLength(1);
  const selected = workspace.projects[0];
  expect(selected.id).toBe(selectedProject);
  expect(selected.context).toBe("Verified by Ana\nNext shift reviews coverage");
  expect(selected.tasks[0].status).toBe("done");
  expect(selected.tasks[1]).toMatchObject({ owner: "Ana", status: "blocked", blocker: "Waiting for coordinator review" });
  expect(selected.deliverables[0]).toMatchObject({ title: "Coordinator reviewed the source", done: true });
  const full = WorkspaceFileSchema.parse(JSON.parse((await downloadText(page, "Export backup")).text));
  expect(full.workspace.projects).toHaveLength(2);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Water directory", exact: true })).toBeVisible();
  await expect(checklist).toBeChecked();
  await page.getByLabel("Import workspace", { exact: true }).setInputFiles(selectedDownload.path);
  await page.getByRole("button", { name: "Import as a new workspace", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Hackathon", exact: true }).locator("option")).toHaveCount(2);
  await expect(page.getByRole("navigation", { name: "Projects", exact: true }).getByRole("button")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Water directory", exact: true })).toBeVisible();
  await expect(checklist).toBeChecked();
  const imported = WorkspaceFileSchema.parse(JSON.parse((await downloadText(page, "Export backup")).text)).workspace;
  expect(imported.id).not.toBe(workspace.id);
  expect(imported.projects).toHaveLength(1);
  expect(imported.projects[0].id).not.toBe(selected.id);
  expect(imported.projects[0].context).toBe(selected.context);
  expect(imported.projects[0].tasks.map((task) => task.status)).toEqual(selected.tasks.map((task) => task.status));
  expect(imported.projects[0].deliverables[0].done).toBe(true);
  const originalIds = new Set([...selected.tasks, ...selected.deliverables].map((item) => item.id));
  expect([...imported.projects[0].tasks, ...imported.projects[0].deliverables].every((item) => !originalIds.has(item.id))).toBe(true);
});

test("denied clipboard access keeps a selectable handoff and working download", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: async () => { throw new DOMException("Clipboard denied", "NotAllowedError"); },
    } });
  });
  await createQuickProject(page);
  await page.getByText("Share context and handoff", { exact: true }).click();
  await page.getByRole("button", { name: "Copy handoff", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Clipboard access is unavailable" })).toBeVisible();
  const preview = page.getByLabel("Project handoff preview", { exact: true });
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("readonly", "");
  await preview.focus();
  await expect(preview).toBeFocused();
  const download = await downloadText(page, "Download Markdown");
  expect(download.text).toBe(await preview.inputValue());
});

test("storage failure keeps the complete quick-start draft and creates no workspace", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "projecthub.workspaces.v1") throw new DOMException("Quota exceeded", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.goto("/en/start", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Project name", { exact: true }).fill("Unsaved directory");
  await page.getByLabel(/What will you deliver/).fill("A verified directory");
  await page.getByLabel(/Project context/).fill("Keep this research draft");
  await page.getByText("Event, timing and task owner", { exact: true }).click();
  await page.getByLabel("Hackathon name", { exact: true }).fill("Unsaved weekend");
  await page.getByRole("combobox", { name: "Time available", exact: true }).selectOption("24");
  await page.getByLabel(/Owner/).fill("Ana");
  const submit = page.getByRole("button", { name: "Create my project plan", exact: true });
  await submit.click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Could not save");
  await expect(page).toHaveURL(/\/en\/start$/);
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue("Unsaved directory");
  await expect(page.getByLabel(/What will you deliver/)).toHaveValue("A verified directory");
  await expect(page.getByLabel(/Project context/)).toHaveValue("Keep this research draft");
  await expect(page.getByLabel("Hackathon name", { exact: true })).toHaveValue("Unsaved weekend");
  await expect(page.getByRole("combobox", { name: "Time available", exact: true })).toHaveValue("24");
  await expect(page.getByLabel(/Owner/)).toHaveValue("Ana");
  await expect(submit).toBeEnabled();
  await page.goto("/en/workspace", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A workspace for your hackathon");
  await expect(page.getByRole("button", { name: "Export backup", exact: true })).toHaveCount(0);
});

test("Spanish crisis starter, context and handoff fit the viewport", async ({ page }) => {
  await page.goto("/es/start", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Una idea. Un plan. Un punto de partida.");
  await page.getByLabel("Nombre del proyecto", { exact: true }).fill("Directorio comunitario");
  await page.getByLabel(/Contexto del proyecto/).fill(`Fuente confirmada por el coordinador\n${"Referencia".repeat(18)}`);
  await page.getByRole("combobox", { name: /¿Cómo empiezas/ }).selectOption("crisis");
  await page.getByRole("button", { name: "Crear mi plan de proyecto", exact: true }).click();
  await expect(page).toHaveURL(/\/es\/workspace\?event=[^&]+&focus=/);
  await expect(page.getByRole("heading", { name: "Directorio comunitario", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Por hacer", exact: true }).getByRole("article")).toHaveCount(3);
  await expect(page.getByRole("checkbox", { name: "Identificar responsable y realizar el traspaso", exact: true })).toBeVisible();
  await page.getByText("Contexto del proyecto", { exact: true }).click();
  await page.getByText("Compartir contexto y entrega", { exact: true }).click();
  const handoff = await page.getByLabel("Vista previa del resumen del proyecto", { exact: true }).inputValue();
  expect(handoff).toContain("Respuesta a crisis");
  expect(handoff).toContain("Fuente confirmada por el coordinador");
  const { workspace } = await projectBackup(page, "Descargar copia del proyecto");
  expect(workspace.mode).toBe("crisis");
  expect(workspace.projects[0].tasks).toHaveLength(3);
  expect(workspace.projects[0].deliverables).toHaveLength(4);
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});


test("saving stays locked during a slow workspace navigation and does not duplicate the event", async ({ page }) => {
  await page.goto("/en/start", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Project name", { exact: true }).fill("Single creation");
  let release: () => void = () => {};
  const delayed = new Promise<void>((resolve) => { release = resolve; });
  let held = false;
  await page.route("**/en/workspace?**", async (route) => {
    if (new URL(route.request().url()).searchParams.has("event")) {
      held = true;
      await delayed;
    }
    await route.continue();
  });
  try {
    await page.getByRole("button", { name: "Create my project plan", exact: true }).click();
    await expect.poll(() => held).toBe(true);
    const form = page.locator("form").filter({ has: page.locator('input[name="projectName"]') });
    // A route loading boundary may already replace the form. While it remains
    // visible, creation must stay disabled until that transition completes.
    await expect.poll(async () => await form.count() === 0 || await form.getByRole("button").isDisabled()).toBe(true);
    if (await form.count()) {
      await expect(page.getByRole("button", { name: "Saving your plan…", exact: true })).toBeDisabled();
      await form.evaluate((element) => (element as HTMLFormElement).requestSubmit());
    }
  } finally {
    release();
  }
  await expect(page.getByRole("heading", { name: "Single creation", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Hackathon", exact: true }).locator("option")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "To do", exact: true }).getByRole("article")).toHaveCount(3);
});

test("a missing event or project bookmark explains the missing local data before showing other work", async ({ page }) => {
  await createQuickProject(page, "Existing private project", "Existing weekend");
  const savedUrl = page.url();
  for (const missing of ["event", "focus"]) {
    const unavailable = new URL(savedUrl);
    unavailable.searchParams.set(missing, "00000000-0000-4000-8000-000000000000");
    await page.goto(unavailable.toString(), { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("status").filter({ hasText: "This saved project or event is not in this browser" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Existing private project", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Existing weekend", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Continue existing work", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/workspace$/);
    await expect(page.getByRole("heading", { name: "Existing private project", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Existing weekend", exact: true })).toBeVisible();
  }
});
