"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

// Shared filter form for the board and builders pages. The parent (a Server
// Component) computes the small option lists — the heavy `projects`/`builders`
// arrays never cross to the client. Each dropdown auto-applies on change via the
// Next router (client-side RSC navigation), so the page's loading.tsx skeleton
// shows immediately instead of the browser freezing on a full-document reload —
// the difference between "nothing happened" and visible feedback while the server
// renders. `method="get"` + named fields stay as a no-JS progressive-enhancement
// fallback; with JS the router path wins (onChange / intercepted submit).

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterGroup {
  name: string;
  label: string;
  options: FilterOption[];
}

const SELECT = "rounded-token border border-border bg-surface px-3 py-2 text-sm text-text";

export function FilterForm({
  base,
  current,
  groups,
  hidden,
  allLabel,
  applyLabel,
  clearLabel,
}: {
  // Destination path, already locale-prefixed (e.g. "/en/board").
  base: string;
  // Every active filter value keyed by field — preserved across a single-field
  // change so picking a status never drops an existing category (or a URL-only
  // filter like ?priority= with no dropdown of its own).
  current: Record<string, string | undefined>;
  groups: FilterGroup[];
  // Non-dropdown params to keep on every navigation (e.g. board's `view=all`).
  hidden?: Record<string, string>;
  allLabel: string;
  applyLabel: string;
  clearLabel: string;
}) {
  const router = useRouter();

  function hrefFor(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(hidden ?? {})) if (v) params.set(k, v);
    const merged = { ...current, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  // Plain push (no transition): the navigation suspends the dynamic route, so
  // loading.tsx replaces the page at once — the strongest "it's working" signal,
  // and it reuses the skeleton the route already ships.
  function go(overrides: Record<string, string | undefined>) {
    router.push(hrefFor(overrides));
  }

  return (
    <form
      method="get"
      action={base}
      onSubmit={(e) => {
        e.preventDefault();
        go({});
      }}
      className="flex flex-wrap items-end gap-3 rounded-token border border-border bg-surface p-4"
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {groups.map((g) => (
        <label key={g.name} className="flex flex-col gap-1 text-xs font-medium text-muted">
          {g.label}
          {/* Uncontrolled + a key tied to the active value: on navigation the new
              server render changes the key, remounting the select so it always
              mirrors the URL — without a controlled value that would flash stale
              or warn on a URL-only option. */}
          <select
            key={current[g.name] ?? ""}
            name={g.name}
            defaultValue={current[g.name] ?? ""}
            onChange={(e) => go({ [g.name]: e.target.value || undefined })}
            className={SELECT}
          >
            <option value="">{allLabel}</option>
            {g.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-token bg-primary px-4 py-2 text-sm font-medium text-primary-ink hover:opacity-90"
        >
          {applyLabel}
        </button>
        <Link
          href={base}
          className="rounded-token border border-border px-3 py-2 text-sm text-muted hover:text-text"
        >
          {clearLabel}
        </Link>
      </div>
    </form>
  );
}
