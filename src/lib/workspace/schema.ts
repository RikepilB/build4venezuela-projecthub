import { z } from "zod";

export const WorkspaceMode = z.enum(["planned", "rapid", "crisis"]);
export const TaskStatus = z.enum(["todo", "doing", "blocked", "done"]);
export const TaskPriority = z.enum(["high", "normal", "low"]);
const Id = z.uuid();
const Title = z.string().trim().min(1).max(120);
const Note = z.string().trim().max(2000);
const Deadline = z.union([z.iso.datetime({ offset: true }), z.literal("")]);
const Link = z.union([z.url({ protocol: /^https?$/ }).max(2048), z.literal("")]);

export const TaskSchema = z.object({
  id: Id,
  title: Title,
  owner: z.string().trim().max(80),
  status: TaskStatus,
  priority: TaskPriority,
  dueAt: Deadline,
  blocker: z.string().trim().max(500),
});

export const WorkProjectSchema = z.object({
  id: Id,
  name: Title,
  goal: Note,
  repoUrl: Link,
  demoUrl: Link,
  submissionUrl: Link,
  tasks: z.array(TaskSchema).max(200),
  deliverables: z.array(z.object({ id: Id, title: Title, done: z.boolean() })).max(30),
});

export const WorkspaceSchema = z.object({
  id: Id,
  name: Title,
  mode: WorkspaceMode,
  objective: Note,
  deadline: Deadline,
  projects: z.array(WorkProjectSchema).max(50),
  updatedAt: z.iso.datetime({ offset: true }),
}).superRefine((workspace, ctx) => {
  // Leave room for the portable file envelope within the 2 MB import limit.
  if (new TextEncoder().encode(JSON.stringify(workspace)).length > 1_900_000) {
    ctx.addIssue({ code: "custom", message: "Workspace exceeds portable backup limit" });
  }
  const ids = [workspace.id, ...workspace.projects.flatMap((project) => [
    project.id, ...project.tasks.map((task) => task.id), ...project.deliverables.map((item) => item.id),
  ])];
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: "custom", message: "Duplicate identifiers" });
  }
});

export const WorkspaceFileSchema = z.object({
  format: z.literal("projecthub-workspace"),
  version: z.literal(1),
  workspace: WorkspaceSchema,
});

export const WorkspaceStoreSchema = z.object({
  version: z.literal(1),
  workspaces: z.array(WorkspaceSchema).max(30),
}).superRefine((store, ctx) => {
  if (new Set(store.workspaces.map((item) => item.id)).size !== store.workspaces.length) {
    ctx.addIssue({ code: "custom", message: "Duplicate workspaces" });
  }
});

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type WorkProject = z.infer<typeof WorkProjectSchema>;
export type WorkTask = z.infer<typeof TaskSchema>;
export type WorkspaceStore = z.infer<typeof WorkspaceStoreSchema>;
export type Mode = z.infer<typeof WorkspaceMode>;
