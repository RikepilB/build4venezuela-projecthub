"use client";

import { useActionState } from "react";
import { joinProject } from "@/actions/join-project";
import { initialJoinState } from "@/actions/join-project-types";
import type { Dictionary } from "@/lib/i18n/config";

const INPUT =
  "w-full rounded-token border border-border bg-surface px-3 py-2 text-text placeholder:text-muted";

export function JoinProjectForm({ slug, dict }: { slug: string; dict: Dictionary }) {
  const [state, action, pending] = useActionState(joinProject, initialJoinState);

  if (state.ok) {
    return (
      <p className="rounded-token border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
        {dict.detail.joinSuccess}
      </p>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-token border border-border bg-surface p-4 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="project_slug" value={slug} />
      {/* Honeypot */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <label className="flex flex-1 flex-col gap-1.5">
        <span className="text-sm font-medium text-text">{dict.detail.joinName}</span>
        <input name="name" required maxLength={80} className={INPUT} />
      </label>

      <label className="flex flex-1 flex-col gap-1.5">
        <span className="text-sm font-medium text-text">{dict.detail.joinRole}</span>
        <input name="role" maxLength={80} className={INPUT} placeholder="Frontend / Design / AI…" />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-token bg-primary px-5 py-2.5 font-medium text-primary-ink hover:opacity-90 disabled:opacity-60"
      >
        {dict.detail.joinSubmit}
      </button>

      {state.error === "save_failed" && (
        <p className="text-xs text-danger sm:basis-full">Could not save (persists only when running locally).</p>
      )}
    </form>
  );
}
