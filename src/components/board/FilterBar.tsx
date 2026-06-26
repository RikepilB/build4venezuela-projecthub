import Link from "next/link";
import type { Locale, ProjectFilter } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";
import { categories, statuses, needTypes, stacks } from "@/lib/taxonomy";

const SELECT =
  "rounded-token border border-border bg-surface px-3 py-2 text-sm text-text";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted">
      {label}
      {children}
    </label>
  );
}

// GET form — every filter is a URL searchParam the board page reads server-side.
export function FilterBar({
  locale,
  dict,
  current,
}: {
  locale: Locale;
  dict: Dictionary;
  current: ProjectFilter;
}) {
  return (
    <form
      method="get"
      action={localePath(locale, "/board")}
      className="flex flex-wrap items-end gap-3 rounded-token border border-border bg-surface p-4"
    >
      <Field label={dict.board.category}>
        <select name="category" defaultValue={current.category ?? ""} className={SELECT}>
          <option value="">{dict.board.all}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c[locale]}
            </option>
          ))}
        </select>
      </Field>

      <Field label={dict.board.stack}>
        <select name="stack" defaultValue={current.stack ?? ""} className={SELECT}>
          <option value="">{dict.board.all}</option>
          {stacks.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label={dict.board.language}>
        <select name="language" defaultValue={current.language ?? ""} className={SELECT}>
          <option value="">{dict.board.all}</option>
          <option value="es">ES</option>
          <option value="en">EN</option>
        </select>
      </Field>

      <Field label={dict.board.status}>
        <select name="status" defaultValue={current.status ?? ""} className={SELECT}>
          <option value="">{dict.board.all}</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s[locale]}
            </option>
          ))}
        </select>
      </Field>

      <Field label={dict.board.need}>
        <select name="need" defaultValue={current.need ?? ""} className={SELECT}>
          <option value="">{dict.board.all}</option>
          {needTypes.map((n) => (
            <option key={n.id} value={n.id}>
              {n[locale]}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-token bg-primary px-4 py-2 text-sm font-medium text-primary-ink hover:opacity-90"
        >
          {dict.board.filters}
        </button>
        <Link
          href={localePath(locale, "/board")}
          className="rounded-token border border-border px-3 py-2 text-sm text-muted hover:text-text"
        >
          {dict.board.clear}
        </Link>
      </div>
    </form>
  );
}
