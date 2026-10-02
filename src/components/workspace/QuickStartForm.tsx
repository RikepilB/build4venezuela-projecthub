"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/lib/types";
import { WorkspaceMode, type Mode, type Workspace } from "@/lib/workspace/schema";
import { createQuickWorkspace } from "@/lib/workspace/quick-start";
import { workspaceCopy } from "@/lib/workspace/copy";
import { quickCopy } from "@/lib/workspace/quick-copy";
import { Field, inputClass, primaryClass } from "./controls";

export function QuickStartForm({ locale, onSave }: { locale: Locale; onSave: (workspace: Workspace) => Promise<boolean> }) {
  const copy = workspaceCopy[locale];
  const quick = quickCopy[locale];
  const [mode, setMode] = useState<Mode>("rapid");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setError("");
    let workspace: Workspace;
    try {
      const duration = String(form.get("duration") ?? "");
      workspace = createQuickWorkspace({
        projectName: String(form.get("projectName") ?? ""),
        goal: String(form.get("goal") ?? ""),
        eventName: String(form.get("eventName") ?? ""),
        context: String(form.get("context") ?? ""),
        owner: String(form.get("owner") ?? ""), mode,
        durationHours: duration ? Number(duration) as 6 | 24 | 48 : undefined,
      }, locale, () => crypto.randomUUID(), new Date().toISOString());
    } catch { setError(copy.invalid); return; }
    setBusy(true);
    try {
      // Keep creation locked after saving while the route transition completes.
      if (!await onSave(workspace)) setBusy(false);
    } catch { setError(copy.saveError); setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-5 rounded-token border border-border bg-surface p-5 sm:p-7">
    <div><h2 className="text-2xl font-semibold tracking-tight">{quick.formTitle}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{quick.formNote}</p></div>
    <Field title={copy.projectName}><input name="projectName" required maxLength={120} className={inputClass} /></Field>
    <Field title={`${copy.projectGoal} · ${copy.optional}`}><textarea name="goal" rows={2} maxLength={2000} placeholder={quick.goalPlaceholder} className={inputClass} /></Field>
    <Field title={`${copy.context} · ${copy.optional}`}><textarea name="context" rows={3} maxLength={2000} placeholder={quick.contextPlaceholder} className={inputClass} /></Field>
    <Field title={copy.mode}><select name="mode" value={mode} onChange={(event) => setMode(WorkspaceMode.parse(event.target.value))} className={inputClass}>{WorkspaceMode.options.map((value) => <option key={value} value={value}>{copy.modes[value]}</option>)}</select><span className="mt-2 block text-xs leading-relaxed">{copy.modeNotes[mode]}</span></Field>
    <details className="border-y border-border py-3">
      <summary className="cursor-pointer py-1 text-sm font-medium">{quick.options}</summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field title={copy.eventName}><input name="eventName" maxLength={120} placeholder={quick.eventPlaceholder} className={inputClass} /></Field>
        <Field title={quick.duration}><select name="duration" defaultValue="" className={inputClass}><option value="">{quick.noDeadline}</option>{[6, 24, 48].map((hours) => <option key={hours} value={hours}>{hours} {quick.hours}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field title={`${copy.owner} · ${copy.optional}`}><input name="owner" maxLength={80} className={inputClass} /><span className="mt-2 block text-xs leading-relaxed">{quick.ownerNote}</span></Field></div>
      </div>
    </details>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button disabled={busy} className={`${primaryClass} w-full sm:w-auto`}>{busy ? quick.creating : quick.submit}</button>
  </form>;
}
