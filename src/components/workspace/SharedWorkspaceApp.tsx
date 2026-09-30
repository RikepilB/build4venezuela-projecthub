"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/types";
import { sharedCopy } from "@/lib/workspace/shared-copy";
import { SharedWorkspaceSchema, type SharedMutation, type SharedWorkspace } from "@/lib/workspace/shared-schema";
import { WorkspaceApp } from "./WorkspaceApp";
import { PrivateLink } from "./SharedAccess";
import { buttonClass, displayDate, Field, inputClass, primaryClass } from "./controls";

export function SharedWorkspaceApp({ id, locale }: { id: string; locale: Locale }) {
  const copy = sharedCopy[locale];
  const [data, setData] = useState<SharedWorkspace | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [issuedLink, setIssuedLink] = useState<{ token: string; recovery: boolean } | null>(null);
  const [confirm, setConfirm] = useState<SharedMutation | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const joining = useRef(false);
  const path = `/api/workspaces/${id}`;
  const message = useCallback((code: string) => code === "conflict" ? copy.conflict : code === "access" ? copy.access : code === "limit" ? copy.limit : code === "invalid" ? copy.invalid : copy.unavailable, [copy]);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (inFlight.current) return;
    const requestGeneration = generation.current;
    try {
      const response = await fetch(path, { cache: "no-store", signal });
      const result = await response.json();
      if (requestGeneration !== generation.current) return;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) setData(null);
        setError(message(result.error)); return;
      }
      setData(SharedWorkspaceSchema.parse(result.data));
      setError((previous) => previous === copy.conflict ? previous : "");
    } catch (failure) {
      if (!(failure instanceof DOMException && failure.name === "AbortError")) setError(copy.offline);
    } finally { setLoading(false); }
  }, [path, message, copy]);

  useEffect(() => {
    const controller = new AbortController();
    const candidate = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (candidate && /^[a-f0-9]{64}$/.test(candidate)) {
      // Invitation secrets never enter server URLs, logs, referrers or persistent JS storage.
      joining.current = true;
      // Defer initialization until after hydration; the hash is browser-only state.
      queueMicrotask(() => { setToken(candidate); setLoading(false); });
      window.history.replaceState(null, "", window.location.pathname);
    } else { queueMicrotask(() => void refresh(controller.signal)); }
    const timer = setInterval(() => { if (!document.hidden && !joining.current) void refresh(controller.signal); }, 10_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [refresh]);

  async function mutate(input: SharedMutation) {
    if (inFlight.current) return false;
    inFlight.current = true; generation.current++; setBusy(true); setError("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const result = await response.json();
      if (!response.ok) {
        setError(message(result.error));
        if (response.status === 409) {
          const latest = await fetch(path, { cache: "no-store" });
          if (latest.ok) setData(SharedWorkspaceSchema.parse((await latest.json()).data));
        }
        if (response.status === 401 || response.status === 403) setData(null);
        return false;
      }
      setData(SharedWorkspaceSchema.parse(result.data));
      if (input.action === "join") { joining.current = false; setToken(""); }
      if (result.token) setIssuedLink({ token: result.token, recovery: input.action === "recovery" });
      setConfirm(null);
      return true;
    } catch { setError(copy.offline); return false; }
    finally { inFlight.current = false; setBusy(false); }
  }

  return <div className="space-y-6">
    <Link href={`/${locale}/workspace`} className="inline-block text-sm text-primary underline underline-offset-4">← {copy.back}</Link>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-token border border-danger/50 p-4 text-sm"><p className="max-w-3xl text-danger">{error}</p><button className={buttonClass} disabled={busy} onClick={() => void refresh()}>{copy.retry}</button></div>}
    {token ? <form className="mx-auto max-w-xl space-y-4 rounded-token border border-border bg-surface p-6" onSubmit={async (event) => {
      event.preventDefault();
      await mutate({ action: "join", token, label: String(new FormData(event.currentTarget).get("label")) });
    }}><h1 className="text-2xl font-semibold">{copy.titleJoin}</h1><p className="text-sm text-muted">{copy.joinNote}</p><Field title={copy.label}><input name="label" required maxLength={80} autoComplete="nickname" className={inputClass} /></Field><p className="text-sm text-muted">{copy.guest}</p><button disabled={busy} className={primaryClass}>{copy.join}</button></form>
      : loading ? <p role="status" className="py-16 text-muted">{copy.refreshing}</p> : data ? <>
        <p className="text-sm text-muted">{copy.shared} · {copy[data.role]} · {copy.revision} {data.revision}</p>
        <WorkspaceApp locale={locale} remote={{ state: data, onSave: (workspace, revision) => mutate({ action: "save", document: workspace, revision }) }} />
        {data.role === "owner" && <details className="rounded-token border border-border p-5">
          <summary className="cursor-pointer font-semibold">{copy.team}</summary>
          <div className="mt-4 space-y-5">
            <p className="text-sm text-muted">{copy.teamHint}</p>
            <ul className="divide-y divide-border">{data.members.map((member) => <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span className="break-words">{member.label} · {copy[member.role]}</span>{member.userId !== data.userId && <button className={buttonClass} disabled={busy} onClick={() => setConfirm({ action: "remove_member", userId: member.userId })}>{copy.remove}: {member.label}</button>}</li>)}</ul>
            <form className="flex flex-wrap items-end gap-3" onSubmit={async (event) => {
              event.preventDefault();
              const role = new FormData(event.currentTarget).get("role") === "viewer" ? "viewer" : "editor";
              await mutate({ action: "invite", role });
            }}><Field title={copy.inviteRole}><select name="role" className={inputClass}><option value="editor">{copy.editor}</option><option value="viewer">{copy.viewer}</option></select></Field><button disabled={busy} className={buttonClass}>{copy.invite}</button></form>
            {issuedLink && <PrivateLink copy={copy} recovery={issuedLink.recovery} url={`${window.location.origin}/${locale}/workspace/${id}#token=${issuedLink.token}`} />}
            {data.invitations.length > 0 && <section className="space-y-2"><h3 className="text-sm font-semibold">{copy.pending}</h3>{data.invitations.map((invitation) => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>{copy[invitation.role]} · {displayDate(invitation.expiresAt, locale)}</span><button className={buttonClass} disabled={busy} onClick={() => void mutate({ action: "revoke_invite", id: invitation.id })}>{copy.revoke}</button></div>)}</section>}
            <button className={buttonClass} disabled={busy} onClick={() => setConfirm({ action: "recovery" })}>{copy.rotate}</button>
            {confirm && <div className="space-y-3 border-t border-border pt-4"><p>{confirm.action === "recovery" ? copy.confirmRotate : copy.confirmRemove}</p><div className="flex gap-2"><button disabled={busy} className={primaryClass} onClick={() => void mutate(confirm)}>{confirm.action === "recovery" ? copy.rotate : copy.remove}</button><button className={buttonClass} onClick={() => setConfirm(null)}>{copy.cancel}</button></div></div>}
          </div>
        </details>}
        <details className="border-t border-border pt-4"><summary className="cursor-pointer text-sm text-muted">{copy.activity}</summary><ol className="mt-3 space-y-2 text-sm text-muted">{data.activity.map((item, index) => <li key={`${item.at}:${index}`}>{copy.actions[item.action as keyof typeof copy.actions] ?? item.action} · {displayDate(item.at, locale)} · {copy.revision} {item.revision}</li>)}</ol></details>
      </> : <h1 className="text-2xl font-semibold">{copy.title}</h1>}
  </div>;
}
