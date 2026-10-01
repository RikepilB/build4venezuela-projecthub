"use client";

import { useId, useState } from "react";
import type { Locale } from "@/lib/types";
import type { Workspace, WorkProject } from "@/lib/workspace/schema";
import { quickCopy } from "@/lib/workspace/quick-copy";
import { exportProjectHandoff, exportProjectWorkspace } from "@/lib/workspace/handoff";
import { buttonClass, downloadFile, inputClass } from "./controls";

export function ProjectHandoff({ workspace, project, locale }: { workspace: Workspace; project: WorkProject; locale: Locale }) {
  const copy = quickCopy[locale];
  const previewId = useId();
  const [notice, setNotice] = useState("");
  const text = exportProjectHandoff(workspace, project, locale);
  return <details className="rounded-token border border-border p-5">
    <summary className="cursor-pointer text-base font-semibold">{copy.handoff}</summary>
    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">{copy.handoffNote}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <button className={buttonClass} onClick={async () => {
        try { await navigator.clipboard.writeText(text); setNotice(copy.copied); }
        catch { setNotice(copy.copyFailed); }
      }}>{copy.copy}</button>
      <button className={buttonClass} onClick={() => downloadFile(text, `projecthub-${project.id}.md`, "text/markdown;charset=utf-8")}>{copy.markdown}</button>
      <button className={buttonClass} onClick={() => downloadFile(exportProjectWorkspace(workspace, project), `projecthub-${project.id}.json`)}>{copy.backup}</button>
    </div>
    {notice && <p role="status" className="mt-3 text-sm">{notice}</p>}
    <label htmlFor={previewId} className="mt-4 block text-sm text-muted">{copy.preview}</label>
    <textarea id={previewId} readOnly rows={10} value={text} className={`${inputClass} font-mono text-sm`} />
  </details>;
}
