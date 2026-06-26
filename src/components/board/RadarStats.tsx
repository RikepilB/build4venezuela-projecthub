import type { Project } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";

// At-a-glance "radar" of the board: counts that tell a builder where to plug in.
function Tile({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex min-w-[7rem] flex-1 flex-col gap-0.5 rounded-token border border-border bg-surface p-3">
      <span className={`text-2xl font-extrabold tabular-nums ${accent ?? "text-text"}`}>{value}</span>
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

export function RadarStats({
  projects,
  dict,
}: {
  projects: Project[];
  dict: Dictionary;
}) {
  // Only the signals a builder acts on: where the high-priority work is, what's
  // already live, and who needs hands. Total/stars were generic noise — dropped.
  const highPriority = projects.filter((p) => p.priority === "high").length;
  const mvpReady = projects.filter((p) => p.status === "mvp" || p.status === "live").length;
  const needHelp = projects.filter((p) => p.needs.contributors.length > 0).length;

  return (
    <div className="flex flex-wrap gap-3">
      <Tile label={dict.radar.highPriority} value={highPriority} accent="text-danger" />
      <Tile label={dict.radar.mvpReady} value={mvpReady} accent="text-success" />
      <Tile label={dict.radar.needHelp} value={needHelp} accent="text-primary" />
    </div>
  );
}
