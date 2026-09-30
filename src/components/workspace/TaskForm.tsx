"use client";

import { useState, type FormEvent } from "react";
import { TaskSchema, TaskStatus, TaskPriority, type WorkTask } from "@/lib/workspace/schema";
import { fromLocalInput, toLocalInput } from "@/lib/workspace/domain";
import type { WorkspaceCopy } from "@/lib/workspace/copy";
import { Field, inputClass, buttonClass, primaryClass } from "./controls";

export function TaskForm({ copy, initial, onSave, onCancel }: {
  copy: WorkspaceCopy; initial?: WorkTask;
  onSave: (task: WorkTask, original?: WorkTask) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [original] = useState(initial);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = TaskSchema.safeParse({
      id: original?.id ?? crypto.randomUUID(), title: data.get("title"),
      owner: data.get("owner"), status: data.get("status"), priority: data.get("priority"),
      dueAt: fromLocalInput(String(data.get("dueAt") ?? "")), blocker: data.get("blocker"),
    });
    if (!result.success) { setError(true); return; }
    setBusy(true);
    await onSave(result.data, original);
    setBusy(false);
  }
  return <form onSubmit={submit} className="space-y-4 rounded-token border border-primary/50 bg-surface p-5">
    <h3 className="text-lg font-semibold">{original ? copy.editTask : copy.addTask}</h3>
    <Field title={copy.taskTitle}><input name="title" required maxLength={120} defaultValue={original?.title} className={inputClass} /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field title={copy.owner}><input name="owner" maxLength={80} defaultValue={original?.owner} placeholder={copy.unassigned} className={inputClass} /></Field>
      <Field title={copy.due}><input name="dueAt" type="datetime-local" defaultValue={toLocalInput(original?.dueAt ?? "")} className={inputClass} /><span className="mt-1 block text-xs">{copy.localTime}</span></Field>
      <Field title={copy.status}><select name="status" defaultValue={original?.status ?? "todo"} className={inputClass}>{TaskStatus.options.map((value) => <option key={value} value={value}>{copy.statuses[value]}</option>)}</select></Field>
      <Field title={copy.priority}><select name="priority" defaultValue={original?.priority ?? "normal"} className={inputClass}>{TaskPriority.options.map((value) => <option key={value} value={value}>{copy.priorities[value]}</option>)}</select></Field>
    </div>
    <Field title={copy.blocker}><textarea name="blocker" rows={2} maxLength={500} defaultValue={original?.blocker} placeholder={copy.blockerHint} className={inputClass} /></Field>
    {error && <p role="alert" className="text-sm text-danger">{copy.invalid}</p>}
    <div className="flex gap-2"><button disabled={busy} className={primaryClass}>{original ? copy.save : copy.addTask}</button><button type="button" onClick={onCancel} className={buttonClass}>{copy.cancel}</button></div>
  </form>;
}
