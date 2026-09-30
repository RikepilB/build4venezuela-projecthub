"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/types";
import { sharedCopy, type SharedCopy } from "@/lib/workspace/shared-copy";
import { SharedListSchema, SharedWorkspaceSchema } from "@/lib/workspace/shared-schema";
import type { Workspace } from "@/lib/workspace/schema";
import { buttonClass, downloadFile, Field, inputClass, primaryClass } from "./controls";

export function PrivateLink({ url, recovery, copy }: { url: string; recovery?: boolean; copy: SharedCopy }) {
  const [notice, setNotice] = useState("");
  return <section className="space-y-3 rounded-token border border-primary/50 p-4" aria-label={recovery ? copy.recovery : copy.invite}>
    <p className="font-semibold">{recovery ? copy.recovery : copy.invite}</p>
    <p className="max-w-2xl text-sm text-muted">{recovery ? copy.recoveryNote : copy.inviteNote}</p>
    <div className="flex flex-wrap gap-2">
      <button className={buttonClass} onClick={async () => {
        try { await navigator.clipboard.writeText(url); setNotice(copy.copied); } catch { setNotice(copy.copyFailed); }
      }}>{copy.copy}</button>
      <button className={buttonClass} onClick={() => downloadFile(url, recovery ? "projecthub-owner-recovery.txt" : "projecthub-invitation.txt")}>{recovery ? copy.downloadRecovery : copy.download}</button>
    </div>
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </section>;
}

export function SharedSpaces({ locale }: { locale: Locale }) {
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspaces", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json();
      const parsed = SharedListSchema.safeParse(result.workspaces);
      if (parsed.success) setItems(parsed.data);
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  if (!items.length) return null;
  return <nav aria-label={sharedCopy[locale].title} className="space-y-2 border-b border-border pb-5">
    <h2 className="text-sm font-semibold text-muted">{sharedCopy[locale].title}</h2>
    <div className="flex flex-wrap gap-2">{items.map((item) => <Link key={item.id} href={`/${locale}/workspace/${item.id}`} className={buttonClass}>{item.name}</Link>)}</div>
  </nav>;
}

export function ShareWorkspace({ workspace, locale }: { workspace: Workspace; locale: Locale }) {
  const copy = sharedCopy[locale];
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; recovery: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspaces", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (response.ok) setConfigured((await response.json()).configured === true);
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  if (!configured) return null;
  if (!open) return <button className={buttonClass} onClick={() => setOpen(true)}>{copy.share}</button>;
  return <section className="space-y-4 rounded-token border border-border bg-surface p-5">
    <h2 className="text-xl font-semibold">{copy.share}</h2>
    {created ? <>
      <PrivateLink copy={copy} recovery url={`${window.location.origin}/${locale}/workspace/${created.id}#token=${created.recovery}`} />
      <p className="text-sm text-muted">{copy.guest}</p>
      <Link href={`/${locale}/workspace/${created.id}`} className={primaryClass}>{copy.open}</Link>
    </> : <form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault();
      const label = new FormData(event.currentTarget).get("label");
      setBusy(true); setError("");
      try {
        const response = await fetch("/api/workspaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace, label }) });
        const result = await response.json();
        if (!response.ok) { setError(result.error === "limit" ? copy.limit : copy.unavailable); return; }
        const data = SharedWorkspaceSchema.parse(result.data);
        setCreated({ id: data.workspace.id, recovery: result.recovery });
      } catch { setError(copy.offline); } finally { setBusy(false); }
    }}>
      <p className="text-sm text-muted">{copy.body}</p>
      <Field title={copy.label}><input name="label" required maxLength={80} autoComplete="nickname" className={inputClass} /></Field>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1 size-4 shrink-0 accent-primary" /><span>{copy.consent}</span></label>
      <p className="text-sm text-muted">{copy.guest}</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2"><button disabled={busy} className={primaryClass}>{busy ? copy.creating : copy.create}</button><button type="button" disabled={busy} className={buttonClass} onClick={() => setOpen(false)}>{copy.cancel}</button></div>
    </form>}
  </section>;
}
