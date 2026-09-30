import { WorkspaceFileSchema, WorkspaceSchema, type WorkProject, type Workspace } from "./schema";

export const MAX_IMPORT_BYTES = 2_000_000;

export function projectProgress(project: WorkProject, now: number) {
  const done = project.tasks.filter((task) => task.status === "done").length;
  return {
    total: project.tasks.length,
    done,
    percent: project.tasks.length ? Math.round(done / project.tasks.length * 100) : 0,
    blocked: project.tasks.filter((task) => task.status === "blocked").length,
    overdue: project.tasks.filter((task) => task.status !== "done" && task.dueAt && Date.parse(task.dueAt) < now).length,
    unassigned: project.tasks.filter((task) => task.status !== "done" && !task.owner).length,
    delivered: project.deliverables.filter((item) => item.done).length,
  };
}

export function parseWorkspaceFile(text: string) {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error("Import too large");
  return WorkspaceFileSchema.parse(JSON.parse(text)).workspace;
}

export function exportWorkspace(workspace: Workspace) {
  return JSON.stringify(WorkspaceFileSchema.parse({ format: "projecthub-workspace", version: 1, workspace }));
}

// Each import is a new workspace: shared snapshots cannot overwrite local work.
export function copyWorkspace(workspace: Workspace, id: () => string, now: string): Workspace {
  return WorkspaceSchema.parse({
    ...workspace,
    id: id(),
    updatedAt: now,
    projects: workspace.projects.map((project) => ({
      ...project, id: id(),
      tasks: project.tasks.map((task) => ({ ...task, id: id() })),
      deliverables: project.deliverables.map((item) => ({ ...item, id: id() })),
    })),
  });
}

export function newProject(name: string, titles: string[], id: () => string): WorkProject {
  return {
    id: id(), name, goal: "", repoUrl: "", demoUrl: "", submissionUrl: "", tasks: [],
    deliverables: titles.map((title) => ({ id: id(), title, done: false })),
  };
}

export function toLocalInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : "";
}
