"use client";

import { useActionState } from "react";
import { attachRepo } from "@/actions/attach-repo";
import { initialAttachRepoState } from "@/actions/attach-repo-types";
import type { Dictionary } from "@/lib/i18n/config";

const INPUT =
  "w-full rounded-token border border-border bg-surface px-3 py-2 text-text placeholder:text-muted";

// Shown on the detail page when a project has no repo yet. Anyone can attach one
// (hackathon-open, no auth); the action validates https+github.com and caches the
// contributor count.
export function AddRepoForm({ slug, dict }: { slug: string; dict: Dictionary }) {
  const [state, action, pending] = useActionState(attachRepo, initialAttachRepoState);

  if (state.ok) {
    return (
      <p className="rounded-token border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
        {dict.detail.addRepoSuccess}
      </p>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-token border border-dashed border-border bg-surface p-4"
    >
      <div>
        <p className="text-sm font-semibold text-text">{dict.detail.addRepoTitle}</p>
        <p className="text-xs text-muted">{dict.detail.addRepoHint}</p>
      </div>
      <input type="hidden" name="slug" value={slug} />
      {/* Honeypot */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          name="repo_url"
          type="url"
          required
          inputMode="url"
          placeholder="https://github.com/owner/repo"
          className={INPUT}
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-token bg-primary px-5 py-2.5 font-medium text-primary-ink hover:opacity-90 disabled:opacity-60"
        >
          {dict.detail.addRepoSubmit}
        </button>
      </div>

      {(state.error === "invalid_repo" || state.error === "validation") && (
        <p className="text-xs text-danger">{dict.detail.addRepoInvalid}</p>
      )}
      {state.error === "save_failed" && (
        <p className="text-xs text-danger">{dict.detail.addRepoError}</p>
      )}
    </form>
  );
}
