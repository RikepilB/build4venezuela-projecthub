import { clampPercent } from "@/lib/progress";

// Build-progress track (0–100%). Renders a labelled bar; clamps out-of-range input.
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = clampPercent(value);
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{label}</span>
          <span className="font-medium text-text">{v}%</span>
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
