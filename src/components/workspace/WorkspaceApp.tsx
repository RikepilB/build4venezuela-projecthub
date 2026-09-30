"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { Locale } from "@/lib/types";
import { workspaceCopy } from "@/lib/workspace/copy";
import { copyWorkspace, exportWorkspace, MAX_IMPORT_BYTES, parseWorkspaceFile, projectProgress } from "@/lib/workspace/domain";
import { STORAGE_KEY, readWorkspaces, saveWorkspaces, WorkspaceConflict } from "@/lib/workspace/storage";
import type { Workspace, WorkspaceStore, WorkProject } from "@/lib/workspace/schema";
import type { SharedWorkspace } from "@/lib/workspace/shared-schema";
import { sharedCopy } from "@/lib/workspace/shared-copy";
import { SharedSpaces, ShareWorkspace } from "./SharedAccess";
import { WorkspaceForm } from "./WorkspaceForm";
import { ProjectForm, type ProjectStarter } from "./ProjectForm";
import { ProjectWorkspace } from "./ProjectWorkspace";
import { buttonClass, displayDate, downloadFile, primaryClass } from "./controls";

const CHANGE = "projecthub:workspace-change";
const UNAVAILABLE = "__unavailable__";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(CHANGE, listener); };
}
function getSnapshot() {
  try { return window.localStorage.getItem(STORAGE_KEY); } catch { return UNAVAILABLE; }
}
const serverSnapshot = () => null;
const readySnapshot = () => true;
const notReadySnapshot = () => false;
function clockSubscribe(listener: () => void) {
  const timer = setInterval(listener, 60_000);
  return () => clearInterval(timer);
}
const clockSnapshot = () => Math.floor(Date.now() / 60_000) * 60_000;
const serverClockSnapshot = () => 0;

export function WorkspaceApp({ locale, starter, remote }: { locale: Locale; starter?: ProjectStarter; remote?: {
  state: SharedWorkspace; onSave: (workspace: Workspace, revision: number) => Promise<boolean>;
} }) {
  const shared = sharedCopy[locale];
  const copy = remote ? { ...workspaceCopy[locale], local: shared.shared, localNote: shared.note, saved: shared.saved, conflict: shared.conflict } : workspaceCopy[locale];
  const readOnly = remote?.state.role === "viewer";
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const ready = useSyncExternalStore(subscribe, readySnapshot, notReadySnapshot);
  const now = useSyncExternalStore(clockSubscribe, clockSnapshot, serverClockSnapshot);
  const parsed = useMemo(() => {
    if (remote) return { store: { version: 1 as const, workspaces: [remote.state.workspace] }, error: false };
    try { return { store: readWorkspaces(raw), error: false }; } catch { return { store: null, error: true }; }
  }, [raw, remote]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<"new" | "edit" | null>(null);
  const [projectForm, setProjectForm] = useState<"new" | "edit" | null>(null);
  const [imported, setImported] = useState<Workspace | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const store = parsed.store;
  const active = store?.workspaces.find((event) => event.id === activeId) ?? store?.workspaces[0];
  const project = active?.projects.find((item) => item.id === projectId) ?? active?.projects[0];

  async function persist(next: WorkspaceStore) {
    setError("");
    setNotice("");
    if (remote) {
      if (readOnly) return false;
      const saved = await remote.onSave(next.workspaces[0], remote.state.revision);
      if (saved) setNotice(copy.saved);
      return saved;
    }
    try {
      // A same-origin Web Lock serializes cooperating tabs before comparing revisions.
      const write = () => saveWorkspaces(window.localStorage, raw, next);
      if (navigator.locks) await navigator.locks.request(STORAGE_KEY, write);
      else write();
      window.dispatchEvent(new Event(CHANGE));
      setNotice(copy.saved);
      return true;
    } catch (failure) {
      setError(failure instanceof WorkspaceConflict ? copy.conflict : copy.saveError);
      window.dispatchEvent(new Event(CHANGE));
      return false;
    }
  }

  async function saveEvent(next: Workspace, revision?: string) {
    if (!store) return false;
    const existing = store.workspaces.find((item) => item.id === next.id);
    if (existing && existing.updatedAt !== revision) { setError(copy.conflict); return false; }
    const updated = existing ? store.workspaces.map((item) => item.id === next.id ? next : item) : [...store.workspaces, next];
    if (!await persist({ version: 1, workspaces: updated })) return false;
    setActiveId(next.id);
    setEventForm(null);
    if (!existing && starter) setProjectForm("new");
    return true;
  }

  async function saveProject(next: WorkProject, original?: WorkProject) {
    if (!active || !store) return false;
    const existing = active.projects.find((item) => item.id === next.id);
    if (original && JSON.stringify(existing) !== JSON.stringify(original)) { setError(copy.conflict); return false; }
    const projects = existing ? active.projects.map((item) => item.id === next.id ? next : item) : [...active.projects, next];
    const updated = { ...active, projects, updatedAt: new Date().toISOString() };
    if (!await persist({ version: 1, workspaces: store.workspaces.map((item) => item.id === active.id ? updated : item) })) return false;
    setProjectId(next.id);
    return true;
  }

  const importControl = <label className={`${buttonClass} cursor-pointer focus-within:outline-2 focus-within:outline-primary`}>
    {copy.import}
    <input type="file" accept=".json,application/json" aria-label={copy.import} className="sr-only" disabled={busy} onChange={async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setError("");
      setImported(null);
      try {
        if (file.size > MAX_IMPORT_BYTES) throw new Error("Too large");
        setImported(parseWorkspaceFile(await file.text()));
      } catch { setError(copy.importError); }
    }} />
  </label>;

  if (!ready) return <div className="space-y-4"><h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1><p className="py-12 text-muted">{copy.loading}</p></div>;
  if (parsed.error || !store) return <div role="alert" className="space-y-4 rounded-token border border-danger p-5">
    <p>{raw === UNAVAILABLE ? copy.unavailable : copy.corrupt}</p>
    {raw && raw !== UNAVAILABLE && <button onClick={() => downloadFile(raw, "projecthub-recovery.json")} className={buttonClass}>{copy.recovery}</button>}
  </div>;

  return <div className="space-y-6">
    {!remote && <SharedSpaces locale={locale} />}
    <header className="max-w-3xl">
      <p className="eyebrow">{copy.eyebrow}{active ? ` · ${copy.modes[active.mode]}` : ""}</p>
      <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{active ? active.name : copy.title}</h1>
      {(!active || active.objective) && <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed text-muted">{active ? active.objective : copy.subtitle}</p>}
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
      {active ? <label className="flex min-w-0 max-w-full items-center gap-3 text-sm text-muted">{copy.switchEvent}<select aria-label={copy.switchEvent} value={active.id} onChange={(event) => {
        setActiveId(event.target.value); setProjectId(null); setEventForm(null); setProjectForm(null); setError(""); setNotice("");
      }} className="min-h-11 min-w-0 max-w-64 rounded-token border border-border bg-surface px-3 text-text">{store.workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <span className="text-sm text-muted">{copy.local}</span>}
      {!remote && <div className="flex flex-wrap gap-2">{importControl}{active && <button onClick={() => { setEventForm("new"); setProjectForm(null); }} className={buttonClass}>{copy.create} +</button>}</div>}
    </div>

    <div aria-live="polite" aria-atomic="true" className={error ? "" : "sr-only"}>{error ? <p role="alert" className="rounded-token border border-danger/50 p-3 text-sm text-danger">{error}</p> : notice && <p role="status">{notice}</p>}</div>

    {imported && <section aria-label={copy.import} className="space-y-3 rounded-token border border-primary bg-surface p-5">
      <h2 className="break-words text-xl font-semibold">{imported.name}</h2><p className="text-sm text-muted">{imported.projects.length} {copy.projectCount} · {copy.modes[imported.mode]}</p><p className="text-sm">{copy.importPreview}</p>
      <div className="flex flex-wrap gap-2"><button disabled={busy} className={primaryClass} onClick={async () => {
        setBusy(true);
        const duplicate = copyWorkspace(imported, () => crypto.randomUUID(), new Date().toISOString());
        if (await saveEvent(duplicate)) { setImported(null); setProjectId(null); setProjectForm(null); }
        setBusy(false);
      }}>{copy.importConfirm}</button><button className={buttonClass} onClick={() => setImported(null)}>{copy.cancel}</button></div>
    </section>}

    {(!active || eventForm) ? <WorkspaceForm key={eventForm === "edit" ? active?.id : "new"} copy={copy} initial={eventForm === "edit" ? active : undefined} onSave={saveEvent} onCancel={active ? () => setEventForm(null) : undefined} /> : <>
      <section className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="min-w-0 flex-1"><p className={`mt-2 text-sm ${active.deadline && Date.parse(active.deadline) < now ? "text-danger" : "text-muted"}`}>{active.deadline ? `${Date.parse(active.deadline) < now ? copy.deadlinePassed : copy.deadline} · ${displayDate(active.deadline, locale)}` : copy.noDeadline}</p><p className="mt-1 text-xs text-muted">{copy.local}</p></div>
        <div className="flex flex-wrap gap-2">{!readOnly && <button onClick={() => setEventForm("edit")} className={buttonClass}>{copy.eventSettings}</button>}<button onClick={() => downloadFile(exportWorkspace(active), `projecthub-${active.id}.json`)} className={buttonClass}>{copy.export}</button></div>
      </section>
      {!remote && <ShareWorkspace key={active.id} workspace={active} locale={locale} />}

      {starter && !projectForm && <div className="flex flex-wrap items-center justify-between gap-3 rounded-token border border-primary/40 p-4"><div><p className="font-semibold">{starter.name}</p><p className="mt-1 text-sm text-muted">{copy.starterNote}</p></div><button className={buttonClass} onClick={() => setProjectForm("new")}>{copy.starter}</button></div>}

      <div className="grid items-start gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">{copy.projects} / {active.projects.length}</h2>
          <nav aria-label={copy.projects} className="flex flex-col gap-1">{active.projects.map((item) => {
            const progress = projectProgress(item, now);
            return <button key={item.id} onClick={() => { setProjectId(item.id); setProjectForm(null); }} aria-current={project?.id === item.id ? "true" : undefined} className={`min-h-11 rounded-token border-l-2 px-3 py-3 text-left text-sm ${project?.id === item.id ? "border-primary bg-surface text-text" : "border-transparent text-muted hover:bg-surface"}`}><span className="block break-words font-medium">{item.name}</span><span className="mt-1 block text-xs text-muted">{progress.done}/{progress.total} {copy.completed}</span></button>;
          })}</nav>
          {!readOnly && <button onClick={() => setProjectForm("new")} className={`${buttonClass} w-full`}>{copy.newProject} +</button>}
        </aside>
        {projectForm ? <ProjectForm key={projectForm === "edit" ? project?.id : "new"} copy={copy} mode={active.mode} initial={projectForm === "edit" ? project : undefined} starter={projectForm === "new" ? starter : undefined} onCancel={() => setProjectForm(null)} onSave={async (next, original) => {
          const saved = await saveProject(next, original);
          if (saved) setProjectForm(null);
          return saved;
        }} /> : project ? <ProjectWorkspace key={`${active.id}:${project.id}`} project={project} copy={copy} locale={locale} now={now} onChange={saveProject} onEdit={() => setProjectForm("edit")} readOnly={readOnly} /> : <div className="rounded-token border border-dashed border-border px-6 py-14 text-center"><h3 className="text-xl font-semibold">{copy.emptyProjects}</h3><p className="mx-auto mt-2 max-w-md text-muted">{copy.emptyProjectsBody}</p>{!readOnly && <button onClick={() => setProjectForm("new")} className={`${primaryClass} mt-5`}>{copy.newProject}</button>}</div>}
      </div>
    </>}
    <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted">{copy.localNote}</p>
  </div>;
}
