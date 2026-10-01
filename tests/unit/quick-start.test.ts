import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createQuickWorkspace, QuickStartInputSchema, type QuickStartInput } from "@/lib/workspace/quick-start";
import { exportProjectHandoff, exportProjectWorkspace } from "@/lib/workspace/handoff";
import { copyWorkspace, exportWorkspace, newProject, parseWorkspaceFile } from "@/lib/workspace/domain";
import { WorkspaceSchema } from "@/lib/workspace/schema";
import { workspaceCopy } from "@/lib/workspace/copy";

const now = "2026-09-30T10:00:00-04:00";
const input: QuickStartInput = { projectName: "Useful tool", goal: "Help volunteers find the next task", mode: "rapid" };
const create = (changes: Partial<QuickStartInput> = {}) => createQuickWorkspace({ ...input, ...changes }, "en", randomUUID, now);

describe("quick hackathon start", () => {
  it.each(["en", "es"] as const)("creates a usable, honest %s plan with unique identifiers", (locale) => {
    const workspace = createQuickWorkspace({ ...input, owner: " Alex ", context: "Source: coordinator", eventName: " " }, locale, randomUUID, now);
    expect(workspace.name).toBe(locale === "es" ? "Hackathon rápido" : "Quick hackathon");
    expect(workspace.objective).toBe(input.goal);
    expect(workspace.deadline).toBe("");
    expect(workspace.updatedAt).toBe(now);
    const project = workspace.projects[0];
    expect(project).toMatchObject({ name: input.projectName, goal: input.goal, context: "Source: coordinator" });
    expect(project.tasks).toHaveLength(3);
    expect(project.tasks.every((task) => task.owner === "Alex" && task.status === "todo" && task.dueAt === "" && task.blocker === "")).toBe(true);
    expect(project.deliverables.map((item) => item.title)).toEqual(workspaceCopy[locale].templates.rapid);
    expect(project.deliverables.every((item) => !item.done)).toBe(true);
    const ids = [workspace.id, project.id, ...project.tasks.map((task) => task.id), ...project.deliverables.map((item) => item.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(WorkspaceSchema.parse(workspace)).toEqual(workspace);
  });
  it.each(["planned", "rapid", "crisis"] as const)("uses the %s checklist and mode-specific first action", (mode) => {
    const workspace = create({ mode });
    expect(workspace.projects[0].deliverables.map((item) => item.title)).toEqual(workspaceCopy.en.templates[mode]);
    expect(workspace.projects[0].tasks[0].title).toMatch(mode === "crisis" ? /verify/i : mode === "planned" ? /scope/i : /outcome/i);
    expect(workspace.projects[0].tasks.every((task) => task.owner === "")).toBe(true);
  });
  it.each([6, 24, 48] as const)("sets a chosen %i-hour duration from the provided instant", (durationHours) => {
    const workspace = create({ durationHours });
    expect(Date.parse(workspace.deadline) - Date.parse(now)).toBe(durationHours * 3_600_000);
    expect(workspace.deadline).toBe(new Date(Date.parse(now) + durationHours * 3_600_000).toISOString());
  });
  it("preserves supplied names and omits context when it was not supplied", () => {
    const workspace = create({ eventName: " Community event ", projectName: " Tool " });
    expect(workspace.name).toBe("Community event");
    expect(workspace.projects[0].name).toBe("Tool");
    expect(workspace.projects[0]).not.toHaveProperty("context");
    expect(parseWorkspaceFile(exportWorkspace(workspace))).toEqual(workspace);
  });
  it("uses the same Unicode bounds as saved workspaces", () => {
    const boundary = { ...input, projectName: "🚀".repeat(60), goal: "🚀".repeat(1000), context: "🚀".repeat(1000), owner: "🚀".repeat(40), eventName: "🚀".repeat(60) };
    expect(QuickStartInputSchema.safeParse(boundary).success).toBe(true);
    for (const field of ["projectName", "goal", "context", "owner", "eventName"] as const) {
      expect(QuickStartInputSchema.safeParse({ ...boundary, [field]: boundary[field] + "🚀" }).success).toBe(false);
    }
    expect(create({ goal: " " }).projects[0].goal).toBe("");
    expect(create({ goal: " " }).objective).toBe("");
    expect(QuickStartInputSchema.safeParse({ ...input, projectName: " " }).success).toBe(false);
    expect(QuickStartInputSchema.safeParse({ ...input, durationHours: 12 }).success).toBe(false);
  });
  it("rejects invalid dates and duplicate or invalid generated identifiers", () => {
    expect(() => createQuickWorkspace(input, "en", randomUUID, "2026-02-30T12:00:00Z")).toThrow();
    expect(() => createQuickWorkspace(input, "en", randomUUID, "2026-09-30T12:00:00")).toThrow();
    expect(() => createQuickWorkspace(input, "en", () => "bad-id", now)).toThrow();
    const id = randomUUID();
    expect(() => createQuickWorkspace(input, "en", () => id, now)).toThrow();
  });
});

describe("project context and portable handoff", () => {
  it("preserves old v1 documents without inventing a context field", () => {
    const workspace = create();
    expect(WorkspaceSchema.parse(workspace).projects[0]).not.toHaveProperty("context");
    expect(parseWorkspaceFile(exportWorkspace(workspace))).toEqual(workspace);
  });
  it("preserves bounded context through export, import and copying", () => {
    const workspace = create({ context: "🚀".repeat(1000) });
    expect(parseWorkspaceFile(exportWorkspace(workspace))).toEqual(workspace);
    const copy = copyWorkspace(workspace, randomUUID, "2026-09-30T18:00:00Z");
    expect(copy.projects[0].context).toBe(workspace.projects[0].context);
    expect(copy.id).not.toBe(workspace.id);
    workspace.projects[0].context += "🚀";
    expect(WorkspaceSchema.safeParse(workspace).success).toBe(false);
  });
  it("exports only the selected project while preserving event context and actual task state", () => {
    const workspace = create({ context: "Need an approved source", durationHours: 6, owner: "Alex" });
    const selected = workspace.projects[0];
    selected.tasks[0].status = "blocked";
    selected.tasks[0].blocker = "Waiting for permission";
    selected.tasks[1].status = "done";
    selected.deliverables[0].done = true;
    selected.repoUrl = "https://example.org/repo";
    workspace.projects.push({ ...newProject("Other confidential project", [], randomUUID), context: "Secret sibling context" });
    const before = JSON.stringify(workspace);
    const markdown = exportProjectHandoff(workspace, selected, "en");
    expect(markdown).toContain("Need an approved source");
    expect(markdown).toContain("Blocked");
    expect(markdown).toContain("Waiting for permission");
    expect(markdown).toContain("Alex");
    expect(markdown).toContain("Rapid build");
    expect(markdown).toContain("2026-09-30T20:00:00.000Z");
    expect(markdown).toContain("https://example.org/repo");
    expect(markdown).toContain("- [x]");
    expect(markdown).not.toContain("Other confidential project");
    expect(markdown).not.toContain("Secret sibling context");
    const portable = parseWorkspaceFile(exportProjectWorkspace(workspace, selected));
    expect(portable.projects).toEqual([selected]);
    expect(portable.objective).toBe(workspace.objective);
    expect(copyWorkspace(portable, randomUUID, now).projects[0].id).not.toBe(selected.id);
    expect(JSON.stringify(workspace)).toBe(before);
  });
  it("localizes the handoff and escapes raw HTML and Markdown in participant text", () => {
    const workspace = create({ projectName: "<script>alert(1)</script>", context: "[Open](javascript:alert(1))\n# Fake heading" });
    const project = workspace.projects[0];
    project.tasks[0].owner = "**Owner**";
    project.demoUrl = "https://example.org/demo?q=(test)";
    const markdown = exportProjectHandoff(workspace, project, "es");
    expect(markdown).toContain("Por hacer");
    expect(markdown).toContain("Sin fecha límite");
    expect(markdown).toContain("&lt;script&gt;");
    expect(markdown).toContain("\\[Open\\]");
    expect(markdown).toContain("\\# Fake heading");
    expect(markdown).not.toContain("<script>");
    expect(markdown).toContain("https://example.org/demo?q=%28test%29");
  });
  it("refuses unsafe project URLs and a project outside the chosen workspace", () => {
    const workspace = create();
    expect(() => exportProjectWorkspace(workspace, newProject("Foreign", [], randomUUID))).toThrow();
    expect(() => exportProjectHandoff(workspace, newProject("Foreign", [], randomUUID), "en")).toThrow();
    workspace.projects[0].repoUrl = "javascript:alert(1)";
    expect(() => exportProjectHandoff(workspace, workspace.projects[0], "en")).toThrow();
  });
});
