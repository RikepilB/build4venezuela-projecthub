import type { Complexity, Locale, Priority } from "@/lib/types";
import { complexities, priorities, labelFor } from "@/lib/taxonomy";

// Shared low→high color ramp (token-only): success → accent → danger.
const RANK: Record<"low" | "medium" | "high", string> = {
  low: "border-success/40 bg-success/10 text-success",
  medium: "border-accent/40 bg-accent/10 text-accent",
  high: "border-danger/40 bg-danger/10 text-danger",
};

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {children}
    </span>
  );
}

// Only high/medium priority is worth surfacing — "low"/none is board noise the
// team explicitly doesn't want to read. Single source of truth for both the badge
// and the wrappers that decide whether to render the meta row.
export function isVisiblePriority(level?: Priority | null): level is "high" | "medium" {
  return level === "high" || level === "medium";
}

export function PriorityBadge({ level, locale }: { level: Priority; locale: Locale }) {
  if (!isVisiblePriority(level)) return null;
  return (
    <Pill tone={RANK[level]}>
      <span aria-hidden>▲</span>
      {labelFor(priorities, level, locale)}
    </Pill>
  );
}

export function ComplexityBadge({ level, locale }: { level: Complexity; locale: Locale }) {
  return (
    <Pill tone={RANK[level]}>
      <span aria-hidden>◆</span>
      {labelFor(complexities, level, locale)}
    </Pill>
  );
}

export function StarBadge({ count }: { count: number }) {
  return (
    <Pill tone="border-primary/40 bg-primary/10 text-primary">
      <span aria-hidden>★</span>
      {count.toLocaleString("en-US")}
    </Pill>
  );
}
