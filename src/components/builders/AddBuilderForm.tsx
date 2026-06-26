"use client";

import { useState } from "react";
import { useActionState } from "react";
import { submitBuilder } from "@/actions/submit-builder";
import { initialBuilderSubmitState } from "@/actions/submit-builder-types";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";

const INPUT =
  "w-full rounded-token border border-border bg-surface px-3 py-2 text-text placeholder:text-muted";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text">{label}</span>
      {children}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}

export function AddBuilderForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitBuilder, initialBuilderSubmitState);
  const err = (f: string) => state.fieldErrors?.[f];

  if (state.ok) {
    return (
      <p className="rounded-token border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
        {dict.builders.success}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-token bg-primary px-4 py-2 text-sm font-medium text-primary-ink hover:opacity-90"
      >
        {dict.builders.addCta}
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-token border border-border bg-surface p-4">
      <div>
        <p className="font-semibold text-text">{dict.builders.addTitle}</p>
        <p className="text-sm text-muted">{dict.builders.addSubtitle}</p>
      </div>

      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      {state.error === "save_failed" && (
        <p className="rounded-token border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          Could not save (persists only when running locally).
        </p>
      )}
      {state.error === "validation" && (
        <p className="rounded-token border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {dict.builders.required}
        </p>
      )}

      <Field label={dict.builders.alias} error={err("alias")}>
        <input name="alias" required maxLength={120} className={INPUT} />
      </Field>

      <Field label={`${dict.builders.role} · ${dict.builders.optional}`}>
        <input name="role" maxLength={160} className={INPUT} placeholder="Backend / AI / Frontend" />
      </Field>

      <Field label={`${dict.builders.stackLabel} · ${dict.builders.optional}`}>
        <input name="stack" className={INPUT} placeholder="Next.js, Python, Supabase" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${dict.builders.availability} · ${dict.builders.optional}`}>
          <input name="availability" maxLength={120} className={INPUT} placeholder="Full-time hackathon" />
        </Field>
        <Field label={`${dict.builders.timezone} · ${dict.builders.optional}`}>
          <input name="timezone" maxLength={60} className={INPUT} placeholder="GMT-5" />
        </Field>
      </div>

      <Field label={`${dict.builders.linkedin} · ${dict.builders.optional}`} error={err("linkedin_url")}>
        <input name="linkedin_url" type="url" className={INPUT} placeholder="https://www.linkedin.com/in/you" />
      </Field>

      <Field label={dict.builders.statusLabel}>
        <select name="status" defaultValue="" className={INPUT}>
          <option value="">{dict.builders.statusNone}</option>
          <option value={dict.builders.statusConfirmed}>{dict.builders.statusConfirmed}</option>
          <option value={dict.builders.statusLooking}>{dict.builders.statusLooking}</option>
        </select>
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-token bg-primary px-6 py-2.5 font-medium text-primary-ink hover:opacity-90 disabled:opacity-60"
      >
        {dict.builders.submit}
      </button>
    </form>
  );
}
