"use client";

import { useState, type FormEvent } from "react";
import { WorkProjectSchema, type WorkProject, type Mode } from "@/lib/workspace/schema";
import { newProject } from "@/lib/workspace/domain";
import type { WorkspaceCopy } from "@/lib/workspace/copy";
import { Field, inputClass, buttonClass, primaryClass } from "./controls";

export type ProjectStarter = { name: string; goal: string; repoUrl: string };

export function ProjectForm({ copy, mode, initial, starter, onSave, onCancel }: {
  copy: WorkspaceCopy; mode: Mode; initial?: WorkProject; starter?: ProjectStarter;
  onSave: (project: WorkProject, original?: WorkProject) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [original] = useState(initial);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const project = original ?? newProject(String(data.get("name")), data.has("template") ? copy.templates[mode] : [], () => crypto.randomUUID());
    const result = WorkProjectSchema.safeParse({
      ...project, name: data.get("name"), goal: data.get("goal"), context: data.get("context"),
      repoUrl: data.get("repoUrl"), demoUrl: data.get("demoUrl"), submissionUrl: data.get("submissionUrl"),
      deliverables: original ? original.deliverables.map((item) => ({ ...item, title: String(data.get(`item-${item.id}`) ?? "").trim() })).filter((item) => item.title) : project.deliverables,
    });
    if (!result.success) { setError(true); return; }
    setBusy(true);
    await onSave(result.data, original);
    setBusy(false);
  }
  return <form onSubmit={submit} className="space-y-4 rounded-token border border-border bg-surface p-5">
    <h2 className="text-xl font-semibold">{original ? copy.editProject : copy.newProject}</h2>
    {starter && !original && <p className="text-sm text-muted">{copy.starterNote}</p>}
    <Field title={copy.projectName}><input name="name" required maxLength={120} defaultValue={original?.name ?? starter?.name} className={inputClass} /></Field>
    <Field title={`${copy.projectGoal} · ${copy.optional}`}><textarea name="goal" rows={2} maxLength={2000} defaultValue={original?.goal ?? starter?.goal} className={inputClass} /></Field>
    <Field title={`${copy.context} · ${copy.optional}`}><textarea name="context" rows={4} maxLength={2000} defaultValue={original?.context ?? ""} placeholder={copy.contextHint} className={inputClass} /></Field>
    <div className="grid gap-4 sm:grid-cols-3">
      <Field title={copy.repo}><input name="repoUrl" type="url" maxLength={2048} defaultValue={original?.repoUrl ?? starter?.repoUrl} className={inputClass} placeholder="https://…" /></Field>
      <Field title={copy.demo}><input name="demoUrl" type="url" maxLength={2048} defaultValue={original?.demoUrl} className={inputClass} placeholder="https://…" /></Field>
      <Field title={copy.submission}><input name="submissionUrl" type="url" maxLength={2048} defaultValue={original?.submissionUrl} className={inputClass} placeholder="https://…" /></Field>
    </div>
    {!original && <label className="flex items-center gap-2 text-sm"><input name="template" type="checkbox" defaultChecked className="size-4 accent-primary" />{copy.template}</label>}
    {original && original.deliverables.length > 0 && <fieldset className="space-y-3 border-t border-border pt-4">
      <legend className="text-sm font-semibold">{copy.editChecklist}</legend>
      <p className="text-xs text-muted">{copy.removeChecklistNote}</p>
      {original.deliverables.map((item, index) => <Field key={item.id} title={`${copy.checklistItem} ${index + 1}`}><input name={`item-${item.id}`} maxLength={120} defaultValue={item.title} className={inputClass} /></Field>)}
    </fieldset>}
    {error && <p role="alert" className="text-sm text-danger">{copy.invalid}</p>}
    <div className="flex gap-2"><button disabled={busy} className={primaryClass}>{original ? copy.save : copy.newProject}</button><button type="button" onClick={onCancel} className={buttonClass}>{copy.cancel}</button></div>
  </form>;
}
