import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { WorkspaceSchema, type Workspace, type WorkTask } from "@/lib/workspace/schema";
import { copyWorkspace, exportWorkspace, fromLocalInput, newProject, parseWorkspaceFile, projectProgress, toLocalInput } from "@/lib/workspace/domain";
import { readWorkspaces, saveWorkspaces, STORAGE_KEY, WorkspaceConflict } from "@/lib/workspace/storage";

function workspace(): Workspace {
  return {
    id: randomUUID(), name: "Community hackathon", mode: "rapid", objective: "", deadline: "",
    projects: [newProject("A useful tool", ["Working demo"], randomUUID)], updatedAt: "2026-09-29T10:00:00Z",
  };
}
function task(partial: Partial<WorkTask> = {}): WorkTask {
  return { id: randomUUID(), title: "Test the demo", owner: "", status: "todo", priority: "normal", dueAt: "", blocker: "", ...partial };
}

describe("workspace domain", () => {
  it("creates any named hackathon without planning, dates or a project", () => {
    expect(WorkspaceSchema.parse({ ...workspace(), projects: [] }).deadline).toBe("");
  });
  it("computes progress and attention from actual tasks, excluding completed overdue work", () => {
    const project = workspace().projects[0];
    project.tasks = [task({ status: "done", dueAt: "2026-09-01T12:00:00Z" }), task({ status: "blocked", owner: "Alex" }), task({ dueAt: "2026-09-01T12:00:00Z" }), task({ owner: "Jo" })];
    expect(projectProgress(project, Date.parse("2026-09-29T12:00:00Z"))).toEqual({ total: 4, done: 1, percent: 25, blocked: 1, overdue: 1, unassigned: 1, delivered: 0 });
    expect(projectProgress(newProject("Empty", [], randomUUID), 0).percent).toBe(0);
  });
  it("round trips a versioned portable workspace including links and checklist state", () => {
    const source = workspace();
    source.projects[0].repoUrl = "https://github.com/example/tool";
    source.projects[0].deliverables[0].done = true;
    source.projects[0].tasks = [task({ owner: "Alex", status: "blocked", blocker: "Need dataset" })];
    expect(parseWorkspaceFile(exportWorkspace(source))).toEqual(source);
  });
  it("copies every identifier on import without changing the source", () => {
    const source = workspace();
    source.projects[0].tasks = [task()];
    const before = JSON.stringify(source);
    const copy = copyWorkspace(source, randomUUID, "2026-09-29T12:00:00Z");
    expect(copy.id).not.toBe(source.id);
    expect(copy.projects[0].id).not.toBe(source.projects[0].id);
    expect(copy.projects[0].tasks[0].id).not.toBe(source.projects[0].tasks[0].id);
    expect(copy.projects[0].deliverables[0].id).not.toBe(source.projects[0].deliverables[0].id);
    expect(JSON.stringify(source)).toBe(before);
  });
  it.each(["javascript:alert(1)", "data:text/html,hello", "file:///C:/file.txt"])("rejects unsafe imported link %s", (url) => {
    const source = workspace();
    source.projects[0].demoUrl = url;
    expect(() => exportWorkspace(source)).toThrow();
  });
  it("rejects invalid dates, unknown status and duplicate identifiers", () => {
    expect(WorkspaceSchema.safeParse({ ...workspace(), deadline: "2026-09-31T12:00:00Z" }).success).toBe(false);
    const source = workspace();
    source.projects[0].tasks = [task()];
    source.projects[0].tasks.push(source.projects[0].tasks[0]);
    expect(WorkspaceSchema.safeParse(source).success).toBe(false);
    expect(WorkspaceSchema.safeParse({ ...workspace(), mode: "unknown" }).success).toBe(false);
  });
  it("rejects unknown versions, malformed and oversized backups", () => {
    expect(() => parseWorkspaceFile('{"version":2}')).toThrow();
    expect(() => parseWorkspaceFile("not json")).toThrow();
    expect(() => parseWorkspaceFile(" ".repeat(2_000_001))).toThrow("Import too large");
  });
  it("refuses a workspace too large to export and reimport", () => {
    const source = workspace();
    source.projects = Array.from({ length: 50 }, () => ({
      ...newProject("Tool", [], randomUUID),
      tasks: Array.from({ length: 200 }, () => task({ blocker: "x".repeat(500) })),
    }));
    expect(() => exportWorkspace(source)).toThrow("portable backup limit");
  });
  it("preserves the deadline instant when editing in the device timezone", () => {
    const instant = "2026-10-01T16:30:00-04:00";
    expect(Date.parse(fromLocalInput(toLocalInput(instant)))).toBe(Date.parse(instant));
    expect(fromLocalInput("")).toBe("");
  });
});

describe("workspace persistence", () => {
  it("keeps events separate through save and reload", () => {
    let raw: string | null = null;
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
    const first = workspace();
    first.projects[0].tasks.push(task());
    const second = workspace();
    saveWorkspaces(storage, null, { version: 1, workspaces: [first, second] });
    expect(readWorkspaces(raw).workspaces[1].projects[0].tasks).toEqual([]);
    expect(readWorkspaces(raw).workspaces[0].projects[0].tasks).toHaveLength(1);
  });
  it("refuses a stale-tab write and does not overwrite newer state", () => {
    const storage = { getItem: () => "newer data", setItem: vi.fn() };
    expect(() => saveWorkspaces(storage, null, { version: 1, workspaces: [workspace()] })).toThrow(WorkspaceConflict);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("surfaces storage failures instead of reporting a false save", () => {
    const storage = { getItem: () => null, setItem: vi.fn(() => { throw new Error("QuotaExceededError"); }) };
    expect(() => saveWorkspaces(storage, null, { version: 1, workspaces: [workspace()] })).toThrow("QuotaExceededError");
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
  });
  it("does not silently replace malformed saved data with an empty store", () => {
    expect(readWorkspaces(null).workspaces).toEqual([]);
    expect(() => readWorkspaces("broken")).toThrow();
    expect(() => readWorkspaces('{"version":2,"workspaces":[]}')).toThrow();
  });
});
