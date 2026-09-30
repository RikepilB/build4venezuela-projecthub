"use client";

import { useState, type FormEvent } from "react";
import { WorkspaceMode, WorkspaceSchema, type Workspace, type Mode } from "@/lib/workspace/schema";
import { fromLocalInput, toLocalInput } from "@/lib/workspace/domain";
import type { WorkspaceCopy } from "@/lib/workspace/copy";
import { Field, inputClass, buttonClass, primaryClass } from "./controls";

export function WorkspaceForm({ copy, initial, onSave, onCancel }: {
  copy: WorkspaceCopy;
  initial?: Workspace;
  onSave: (workspace: Workspace, revision?: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [original] = useState(initial);
  const [mode, setMode] = useState<Mode>(initial?.mode ?? "rapid");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = WorkspaceSchema.safeParse({
      ...original,
      id: original?.id ?? crypto.randomUUID(),
      name: form.get("name"), objective: form.get("objective"), mode,
      deadline: fromLocalInput(String(form.get("deadline") ?? "")),
      projects: original?.projects ?? [], updatedAt: new Date().toISOString(),
    });
    if (!result.success) { setError(true); return; }
    setBusy(true);
    await onSave(result.data, original?.updatedAt);
    setBusy(false);
  }

  return <form onSubmit={submit} className="space-y-5 rounded-token border border-border bg-surface p-5 sm:p-7">
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">{original ? copy.eventSettings : copy.createTitle}</h2>
      {!original && <p className="mt-2 max-w-2xl text-muted">{copy.createBody}</p>}
    </div>
    <Field title={copy.eventName}><input name="name" required maxLength={120} defaultValue={original?.name} placeholder={copy.eventPlaceholder} className={inputClass} /></Field>
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-muted">{copy.mode}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {WorkspaceMode.options.map((value) => <label key={value} className={`cursor-pointer rounded-token border p-4 ${mode === value ? "border-primary bg-primary/5" : "border-border"}`}>
          <span className="flex items-center gap-2 font-semibold"><input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="accent-primary" />{copy.modes[value]}</span>
          <span className="mt-2 block text-sm leading-relaxed text-muted">{copy.modeNotes[value]}</span>
        </label>)}
      </div>
    </fieldset>
    <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
      <Field title={`${copy.objective} · ${copy.optional}`}><textarea name="objective" rows={2} maxLength={2000} defaultValue={original?.objective} className={inputClass} /></Field>
      <Field title={`${copy.deadline} · ${copy.optional}`}><input name="deadline" type="datetime-local" defaultValue={toLocalInput(original?.deadline ?? "")} className={inputClass} /><span className="mt-1 block text-xs">{copy.localTime}</span></Field>
    </div>
    {error && <p role="alert" className="text-sm text-danger">{copy.invalid}</p>}
    <div className="flex flex-wrap gap-2"><button disabled={busy} className={primaryClass}>{original ? copy.save : copy.start}</button>{onCancel && <button type="button" onClick={onCancel} className={buttonClass}>{copy.cancel}</button>}</div>
  </form>;
}
