"use client";

import { useState } from "react";
import type { Locale } from "@/lib/types";
import type { WorkspaceCopy } from "@/lib/workspace/copy";
import { TaskStatus, type WorkProject, type WorkTask } from "@/lib/workspace/schema";
import { projectProgress } from "@/lib/workspace/domain";
import { TaskForm } from "./TaskForm";
import { buttonClass, displayDate, inputClass, primaryClass } from "./controls";

export function ProjectWorkspace({ project, copy, locale, now, onChange, onEdit, readOnly = false }: {
  project: WorkProject; copy: WorkspaceCopy; locale: Locale; now: number;
  onChange: (next: WorkProject, original: WorkProject) => Promise<boolean>;
  onEdit: () => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState<WorkTask | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [attention, setAttention] = useState(false);
  const [checklistTitle, setChecklistTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const progress = projectProgress(project, now);
  const isOverdue = (task: WorkTask) => task.status !== "done" && Boolean(task.dueAt) && Date.parse(task.dueAt) < now;
  const tasks = project.tasks.filter((task) => {
    const matches = `${task.title} ${task.owner}`.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale));
    return matches && (!attention || task.status !== "done" && (task.status === "blocked" || isOverdue(task) || !task.owner));
  });
  async function saveTask(task: WorkTask, original?: WorkTask) {
    // Keep unrelated task updates, but never overwrite a task edited while this form was open.
    const current = project.tasks.find((item) => item.id === task.id);
    if (original && JSON.stringify(current) !== JSON.stringify(original)) { setConflict(true); return false; }
    setConflict(false);
    const next = { ...project, tasks: original ? project.tasks.map((item) => item.id === task.id ? task : item) : [...project.tasks, task] };
    if (!await onChange(next, project)) return false;
    setEditing(null);
    return true;
  }
  const linkItems = [[project.repoUrl, copy.openRepo], [project.demoUrl, copy.openDemo], [project.submissionUrl, copy.openSubmission]];

  return <div className="min-w-0 space-y-6">
    <header className="border-b border-border pb-5">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div className="min-w-0 flex-1"><h2 className="break-words text-2xl font-semibold tracking-tight">{project.name}</h2></div>
        {!readOnly && <button onClick={onEdit} className={buttonClass}>{copy.editProject}</button>}
      </div>
      {project.goal && <p className="mt-3 whitespace-pre-wrap break-words text-muted">{project.goal}</p>}
      {project.context && <details className="mt-4 border-l-2 border-primary/40 pl-4"><summary className="cursor-pointer py-1 text-sm font-medium">{copy.context}</summary><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{project.context}</p></details>}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <span className="font-medium">{progress.done}/{progress.total} {copy.completed}</span>
        {progress.blocked > 0 && <span className="text-danger">{progress.blocked} · {copy.statuses.blocked}</span>}
        {progress.overdue > 0 && <span className="text-danger">{progress.overdue} · {copy.overdue}</span>}
        {progress.unassigned > 0 && <span className="text-muted">{progress.unassigned} · {copy.unassigned}</span>}
      </div>
      <progress aria-label={`${copy.tasks}: ${progress.percent}%`} value={progress.done} max={progress.total || 1} className="work-progress mt-3 h-1.5 w-full" />
      {linkItems.some(([url]) => url) && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">{linkItems.filter(([url]) => url).map(([url, label]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">{label} ↗</a>)}</div>}
    </header>

    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">{copy.tasks}</h3>{!readOnly && <button onClick={() => setEditing("new")} className={primaryClass}>{copy.addTask} +</button>}</div>
    {conflict && <p role="alert" className="text-sm text-danger">{copy.conflict}</p>}
    {editing && <TaskForm key={typeof editing === "string" ? editing : editing.id} copy={copy} initial={typeof editing === "string" ? undefined : editing} onCancel={() => { setEditing(null); setConflict(false); }} onSave={saveTask} />}
    {project.tasks.length > 0 ? <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="min-w-0 flex-1 basis-full sm:basis-0"><span className="sr-only">{copy.search}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className={inputClass} /></label>
        <label title={copy.attentionHint} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={attention} onChange={(event) => setAttention(event.target.checked)} className="size-4 accent-primary" />{copy.onlyAttention}</label>
      </div>
      {tasks.length === 0 && <p role="status" className="text-muted">{copy.noMatches}</p>}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {TaskStatus.options.map((status) => {
          const column = tasks.filter((task) => task.status === status);
          return <section key={status} aria-label={copy.statuses[status]} className="min-w-0 rounded-token border border-border bg-surface/50 p-3">
            <h4 className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold"><span>{copy.statuses[status]}</span><span className="font-mono text-xs text-muted">{column.length}</span></h4>
            <div className="space-y-2">{column.map((task) => <article key={task.id} className={`min-w-0 rounded-token border bg-bg p-3 ${status === "blocked" ? "border-danger/50" : "border-border"}`}>
              {readOnly ? <p className="break-words text-sm font-semibold leading-relaxed">{task.title}</p> : <button onClick={() => setEditing(task)} className="block w-full break-words text-left text-sm font-semibold leading-relaxed hover:text-primary" aria-label={`${copy.editTask}: ${task.title}`}>{task.title}</button>}
              <p className="mt-2 break-words text-xs text-muted">{task.owner || copy.unassigned}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs"><span className={task.priority === "high" ? "text-primary" : "text-muted"}>{copy.priorities[task.priority]}</span>{isOverdue(task) && <span className="text-danger">{copy.overdue}</span>}</div>
              {task.dueAt && <p className="mt-1 text-xs text-muted">{displayDate(task.dueAt, locale)}</p>}
              {task.status === "blocked" && task.blocker && <p className="mt-2 break-words text-xs leading-relaxed text-danger">{task.blocker}</p>}
              <label className="mt-3 block"><span className="sr-only">{copy.status}: {task.title}</span><select value={task.status} disabled={busy || readOnly} onChange={async (event) => {
                const value = TaskStatus.parse(event.target.value);
                setBusy(true);
                await onChange({ ...project, tasks: project.tasks.map((item) => item.id === task.id ? { ...item, status: value } : item) }, project);
                setBusy(false);
              }} className="min-h-11 w-full rounded-token border border-border bg-surface px-2 text-xs">{TaskStatus.options.map((value) => <option key={value} value={value}>{copy.statuses[value]}</option>)}</select></label>
            </article>)}</div>
            {column.length === 0 && <p className="py-5 text-xs text-muted">{copy.noTasks}</p>}
          </section>;
        })}
      </div>
    </> : <div className="border-y border-dashed border-border py-10 text-center"><p className="text-lg font-medium">{copy.emptyTasks}</p><p className="mt-2 text-sm text-muted">{copy.emptyTasksBody}</p></div>}

    <section aria-label={copy.readiness} className="rounded-token border border-border p-5">
      <div className="flex items-baseline justify-between gap-3"><h3 className="text-lg font-semibold">{copy.readiness}</h3><span className="font-mono text-sm text-muted">{progress.delivered}/{project.deliverables.length}</span></div>
      <p className="mt-1 text-sm text-muted">{copy.readinessNote}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{project.deliverables.map((item) => <label key={item.id} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={item.done} disabled={busy || readOnly} className="size-4 shrink-0 accent-primary" onChange={async () => {
        setBusy(true);
        await onChange({ ...project, deliverables: project.deliverables.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry) }, project);
        setBusy(false);
      }} /><span className={`break-words ${item.done ? "text-muted line-through" : ""}`}>{item.title}</span></label>)}</div>
      {!readOnly && <form onSubmit={async (event) => {
        event.preventDefault();
        if (!checklistTitle.trim()) return;
        setBusy(true);
        if (await onChange({ ...project, deliverables: [...project.deliverables, { id: crypto.randomUUID(), title: checklistTitle.trim(), done: false }] }, project)) setChecklistTitle("");
        setBusy(false);
      }} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-xs text-muted">{copy.checklistItem}<input value={checklistTitle} onChange={(event) => setChecklistTitle(event.target.value)} required maxLength={120} className={inputClass} /></label>
        <button disabled={busy || project.deliverables.length >= 30} className={buttonClass}>{copy.addItem}</button>
      </form>}
    </section>
  </div>;
}
