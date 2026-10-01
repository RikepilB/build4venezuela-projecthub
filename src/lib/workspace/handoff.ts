import type { Locale } from "@/lib/types";
import { workspaceCopy } from "./copy";
import { exportWorkspace } from "./domain";
import { WorkspaceSchema, type WorkProject, type Workspace } from "./schema";

const handoffCopy = {
  en: { event: "Hackathon", goal: "Outcome", context: "Context and sources", empty: "Not specified", noChecklist: "No checklist items", snapshot: "Project snapshot. This file does not synchronize changes." },
  es: { event: "Hackathon", goal: "Resultado", context: "Contexto y fuentes", empty: "Sin especificar", noChecklist: "Sin puntos en la lista", snapshot: "Copia del proyecto. Este archivo no sincroniza cambios." },
};

function selectedWorkspace(workspace: Workspace, project: WorkProject) {
  if (!workspace.projects.some((item) => item.id === project.id)) throw new Error("Project does not belong to this workspace");
  return WorkspaceSchema.parse({ ...workspace, projects: [project] });
}

// Participant text stays literal in Markdown readers, including raw HTML and links.
function markdown(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/[\\`*{}\[\]()#+\-.!|]/g, (character) => `\\${character}`);
}

function inline(value: string) {
  return markdown(value.replace(/\s+/g, " "));
}

function link(value: string) {
  if (!value) return "";
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) return "";
  return url.href.replace(/[()\\<>"`\s]/g, (character) => encodeURIComponent(character).replace(/\(/g, "%28").replace(/\)/g, "%29"));
}

export function exportProjectWorkspace(workspace: Workspace, project: WorkProject): string {
  return exportWorkspace(selectedWorkspace(workspace, project));
}

export function exportProjectHandoff(workspace: Workspace, project: WorkProject, locale: Locale): string {
  const snapshot = selectedWorkspace(workspace, project);
  const selected = snapshot.projects[0];
  const copy = workspaceCopy[locale];
  const labels = handoffCopy[locale];
  const date = (value: string) => value ? new Date(value).toISOString() : copy.noDeadline;
  const lines = [
    `# ${inline(selected.name)}`, "",
    `- ${labels.event}: ${inline(snapshot.name)}`,
    `- ${copy.mode}: ${copy.modes[snapshot.mode]}`,
    `- ${copy.deadline}: ${date(snapshot.deadline)}`, "",
    `## ${copy.objective}`, "", markdown(snapshot.objective || labels.empty), "",
    `## ${labels.goal}`, "", markdown(selected.goal || labels.empty), "",
    `## ${labels.context}`, "", markdown(selected.context || labels.empty), "",
    `## ${copy.links}`, "",
  ];
  const links = [[copy.repo, selected.repoUrl], [copy.demo, selected.demoUrl], [copy.submission, selected.submissionUrl]]
    .map(([title, value]) => ({ title, href: link(value) })).filter((item) => item.href);
  lines.push(...(links.length ? links.map(({ title, href }) => `- [${title}](${href})`) : [labels.empty]));
  lines.push("", `## ${copy.tasks}`, "");
  if (!selected.tasks.length) lines.push(copy.noTasks);
  for (const task of selected.tasks) {
    lines.push(`- [${task.status === "done" ? "x" : " "}] ${inline(task.title)}`,
      `  - ${copy.status}: ${copy.statuses[task.status]}`,
      `  - ${copy.owner}: ${inline(task.owner || copy.unassigned)}`,
      `  - ${copy.priority}: ${copy.priorities[task.priority]}`);
    if (task.dueAt) lines.push(`  - ${copy.due}: ${date(task.dueAt)}`);
    if (task.blocker) lines.push(`  - ${copy.blocker}: ${inline(task.blocker)}`);
  }
  lines.push("", `## ${copy.readiness}`, "");
  lines.push(...(selected.deliverables.length
    ? selected.deliverables.map((item) => `- [${item.done ? "x" : " "}] ${inline(item.title)}`) : [labels.noChecklist]));
  lines.push("", labels.snapshot, "");
  return lines.join("\n");
}
