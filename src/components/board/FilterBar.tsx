import type { Locale, Project, ProjectFilter } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";
import { categories, statuses, needTypes } from "@/lib/taxonomy";
import { FilterForm } from "@/components/ui/FilterForm";

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

// Server Component: derive the present-only option lists here (over the full
// project set) and hand the small {value,label} arrays to the client FilterForm,
// so the heavy `projects` array never serializes to the browser.
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
  const cats = categories
    .filter((c) => present.category.has(c.id))
    .map((c) => ({ value: c.id, label: c[locale] }));
  const stats = statuses
    .filter((s) => present.status.has(s.id))
    .map((s) => ({ value: s.id, label: s[locale] }));
  const needs = needTypes
    .filter((n) => present.need.has(n.id))
    .map((n) => ({ value: n.id, label: n[locale] }));

  return (
    <FilterForm
      base={localePath(locale, "/board")}
      current={current}
      // Preserve the current view (focus vs all) when applying a filter. Empty
      // string reads back as "no view" → the high-priority default.
      hidden={{ view: showAll ? "all" : "" }}
      groups={[
        { name: "category", label: dict.board.category, options: cats },
        { name: "status", label: dict.board.status, options: stats },
        { name: "need", label: dict.board.need, options: needs },
      ].filter((g) => g.options.length > 0)}
      allLabel={dict.board.all}
      applyLabel={dict.board.filters}
      clearLabel={dict.board.clear}
    />
  );
}
