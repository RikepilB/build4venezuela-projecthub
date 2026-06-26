"use client";

import { useActionState } from "react";
import { submitProject } from "@/actions/submit-project";
import { initialSubmitState } from "@/actions/submit-types";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { categories, statuses } from "@/lib/taxonomy";

const INPUT =
  "w-full rounded-token border border-border bg-surface px-3 py-2 text-text placeholder:text-muted";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text">{label}</span>
      {children}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}

export function SubmitProjectForm({
  locale,
  dict,
  prefillName = "",
}: {
  locale: Locale;
  dict: Dictionary;
  prefillName?: string;
}) {
  const [state, action, pending] = useActionState(submitProject, initialSubmitState);
  const err = (f: string) => state.fieldErrors?.[f];

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot — hidden from humans, bots fill it. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      {state.error === "save_failed" && (
        <p className="rounded-token border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          Could not save (the demo persists submissions only when running locally). Try again locally.
        </p>
      )}
      {state.error === "validation" && (
        <p className="rounded-token border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {dict.submit.required}
        </p>
      )}

      <Field label={dict.submit.name} error={err("name")}>
        <input name="name" defaultValue={prefillName} required maxLength={120} className={INPUT} />
      </Field>

      <Field label={dict.submit.summary} error={err("summary")}>
        <textarea name="summary" required rows={3} maxLength={600} className={INPUT} />
      </Field>

      <Field label={dict.submit.owner} error={err("owner")}>
        <input name="owner" required maxLength={80} className={INPUT} />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-text">{dict.submit.languages}</legend>
        <div className="flex gap-4 text-sm text-text">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="languages" value="es" defaultChecked /> ES
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="languages" value="en" /> EN
          </label>
        </div>
        {err("languages") ? <span className="text-xs text-danger">{err("languages")}</span> : null}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-text">{dict.submit.categories}</legend>
        <div className="grid grid-cols-2 gap-2 text-sm text-text sm:grid-cols-3">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2">
              <input type="checkbox" name="categories" value={c.id} /> {c[locale]}
            </label>
          ))}
        </div>
        {err("categories") ? <span className="text-xs text-danger">{err("categories")}</span> : null}
      </fieldset>

      <Field label={dict.submit.status}>
        <select name="status" defaultValue="planning" className={INPUT}>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s[locale]}
            </option>
          ))}
        </select>
      </Field>

      <Field label={`${dict.submit.repo} · ${dict.submit.optional}`} error={err("repo_url")}>
        <input name="repo_url" type="url" placeholder="https://github.com/org/repo" className={INPUT} />
      </Field>

      <Field label={`${dict.submit.demo} · ${dict.submit.optional}`} error={err("demo_url")}>
        <input name="demo_url" type="url" placeholder="https://example.com" className={INPUT} />
      </Field>

      <Field label={dict.submit.stack}>
        <input name="stack" placeholder="Next.js, Postgres, Python" className={INPUT} />
      </Field>

      <Field label={dict.submit.needContributors}>
        <input name="need_contributors" placeholder="React dev, ES translator" className={INPUT} />
      </Field>

      <Field label={dict.submit.needApiCredits}>
        <input name="need_api_credits" placeholder="OpenAI credits, Maps API" className={INPUT} />
      </Field>

      <Field label={dict.submit.needSponsors}>
        <input name="need_sponsors" placeholder="Hosting, SMS gateway" className={INPUT} />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="rounded-token bg-primary px-6 py-3 font-medium text-primary-ink hover:opacity-90 disabled:opacity-60"
      >
        {dict.submit.submitButton}
      </button>
    </form>
  );
}
