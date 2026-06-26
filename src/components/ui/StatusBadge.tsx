import type { Locale, ProjectStatus } from "@/lib/types";
import { statuses, labelFor } from "@/lib/taxonomy";

const STYLES: Record<ProjectStatus, string> = {
  live: "border-success/40 bg-success/10 text-success",
  wip: "border-accent/40 bg-accent/10 text-accent",
  planning: "border-border bg-surface-2 text-muted",
};

export function StatusBadge({ status, locale }: { status: ProjectStatus; locale: Locale }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      {labelFor(statuses, status, locale)}
    </span>
  );
}
