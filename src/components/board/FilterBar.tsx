import Link from "next/link";
import type { Locale, Project, ProjectFilter } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";
import { categories, statuses, needTypes } from "@/lib/taxonomy";

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

// Only three filters — the axes a builder actually picks on: domain (category),
// stage (status), and how to help (need). A dropdown is dropped entirely when no
// project would populate it, so the bar never offers an empty choice.
function presentSets(projects: Project[]) {
  const category = new Set<string>();
  const status = new Set<string>();
  const need = new Set<string>();
  for (const p of projects) {
    p.categories.forEach((c) => category.add(c));
    status.add(p.status);
    for (const n of needTypes) {
      if ((p.needs[n.id as keyof typeof p.needs] ?? []).length > 0) need.add(n.id);
    }
  }
  return { category, status, need };
}

// GET form — every filter is a URL searchParam the board page reads server-side.
export function FilterBar({
  locale,
  dict,
  current,
  projects,
  showAll,
}: {
  locale: Locale;
  dict: Dictionary;
  current: ProjectFilter;
  projects: Project[];
  showAll: boolean;
}) {
  const present = presentSets(projects);
  const cats = categories.filter((c) => present.category.has(c.id));
  const stats = statuses.filter((s) => present.status.has(s.id));
  const needs = needTypes.filter((n) => present.need.has(n.id));

  return (
    <form
      method="get"
      action={localePath(locale, "/board")}
      className="flex flex-wrap items-end gap-3 rounded-token border border-border bg-surface p-4"
    >
      {/* Preserve the current view (focus vs all) when applying a filter. Empty
          string reads back as "no view" → the high-priority default. */}
      <input type="hidden" name="view" value={showAll ? "all" : ""} />

      {cats.length > 0 && (
        <Field label={dict.board.category}>
          <select name="category" defaultValue={current.category ?? ""} className={SELECT}>
            <option value="">{dict.board.all}</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c[locale]}
              </option>
            ))}
          </select>
        </Field>
      )}

      {stats.length > 0 && (
        <Field label={dict.board.status}>
          <select name="status" defaultValue={current.status ?? ""} className={SELECT}>
            <option value="">{dict.board.all}</option>
            {stats.map((s) => (
              <option key={s.id} value={s.id}>
                {s[locale]}
              </option>
            ))}
          </select>
        </Field>
      )}

      {needs.length > 0 && (
        <Field label={dict.board.need}>
          <select name="need" defaultValue={current.need ?? ""} className={SELECT}>
            <option value="">{dict.board.all}</option>
            {needs.map((n) => (
              <option key={n.id} value={n.id}>
                {n[locale]}
              </option>
            ))}
          </select>
        </Field>
      )}

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
