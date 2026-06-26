"use client";

import { useState } from "react";
import { useActionState } from "react";
import { submitProject } from "@/actions/submit-project";
import { initialSubmitState } from "@/actions/submit-types";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { categories, statuses, priorities, complexities } from "@/lib/taxonomy";

const INPUT =
  "w-full rounded-token border border-border bg-surface px-3 py-2 text-text placeholder:text-muted";

// Quick-add chips for the most common stacks (max 10). Click to append; users can
// still type anything else into the field.
const QUICK_STACK = [
  "Next.js",
  "React",
  "Node.js",
  "TypeScript",
  "Python",
  "FastAPI",
  "Supabase",
  "Postgres",
  "Tailwind",
  "Mobile",
];

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

  // Controlled so the quick-add chips and free text stay in sync.
  const [stack, setStack] = useState("");
  const has = (t: string) =>
    stack
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .includes(t.toLowerCase());
  const toggleTech = (t: string) => {
    if (has(t)) {
      setStack(
        stack
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s && s.toLowerCase() !== t.toLowerCase())
          .join(", "),
      );
    } else {
      const base = stack.replace(/,\s*$/, "").trim();
      setStack(base ? `${base}, ${t}` : t);
    }
  };

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

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={dict.submit.status}>
          <select name="status" defaultValue="planning" className={INPUT}>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s[locale]}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`${dict.submit.priority} · ${dict.submit.optional}`}>
          <select name="priority" defaultValue="" className={INPUT}>
            <option value="">{dict.submit.none}</option>
            {priorities.map((p) => (
              <option key={p.id} value={p.id}>
                {p[locale]}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`${dict.submit.complexity} · ${dict.submit.optional}`}>
          <select name="complexity" defaultValue="" className={INPUT}>
            <option value="">{dict.submit.none}</option>
            {complexities.map((c) => (
              <option key={c.id} value={c.id}>
                {c[locale]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={`${dict.submit.useCase} · ${dict.submit.optional}`}>
        <input name="use_case" maxLength={280} className={INPUT} />
      </Field>

      <Field label={`${dict.submit.progress} · ${dict.submit.optional}`}>
        <input name="progress" type="number" min={0} max={100} step={5} className={INPUT} />
      </Field>

      <Field label={`${dict.submit.repo} · ${dict.submit.optional}`} error={err("repo_url")}>
        <input name="repo_url" type="url" placeholder="https://github.com/org/repo" className={INPUT} />
      </Field>

      <Field label={`${dict.submit.demo} · ${dict.submit.optional}`} error={err("demo_url")}>
        <input name="demo_url" type="url" placeholder="https://example.com" className={INPUT} />
      </Field>

      <Field label={`${dict.submit.stack} · ${dict.submit.optional}`} error={err("stack")}>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_STACK.map((t) => {
            const on = has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTech(t)}
                aria-pressed={on}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                  on
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-surface-2 text-muted hover:border-primary hover:text-primary"
                }`}
              >
                {on ? "✓ " : "+ "}
                {t}
              </button>
            );
          })}
        </div>
        <input
          name="stack"
          value={stack}
          onChange={(e) => setStack(e.target.value)}
          placeholder="Next.js, Postgres, Python"
          className={INPUT}
        />
      </Field>

      <Field label={`${dict.submit.needContributors} · ${dict.submit.optional}`}>
        <input name="need_contributors" placeholder="React dev, ES translator" className={INPUT} />
      </Field>

      <Field label={`${dict.submit.needApiCredits} · ${dict.submit.optional}`}>
        <input name="need_api_credits" placeholder="OpenAI credits, Maps API" className={INPUT} />
      </Field>

      <Field label={`${dict.submit.needSponsors} · ${dict.submit.optional}`}>
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
