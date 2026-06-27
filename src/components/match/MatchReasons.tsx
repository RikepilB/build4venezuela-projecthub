import type { MatchReason } from "@/lib/match/types";
import type { Dictionary } from "@/lib/i18n/config";

// Renders the structured match reasons (score.ts) as localized chips. The scoring lib
// stays language-free; the words live here + in the dictionaries, so EN/ES stay in sync.
export function MatchReasons({ reasons, dict }: { reasons: MatchReason[]; dict: Dictionary }) {
  if (reasons.length === 0) return null;
  return (
    <ul data-testid="match-reasons" className="flex flex-wrap gap-1.5">
      {reasons.map((r, i) => (
        <li
          key={i}
          className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent"
        >
          {reasonText(r, dict)}
        </li>
      ))}
    </ul>
  );
}

function reasonText(r: MatchReason, dict: Dictionary): string {
  switch (r.kind) {
    case "stack":
      return r.tags.join(" · ");
    case "need":
      return `${dict.match.reasonNeed}: ${r.need}`;
    case "priority":
      return dict.match.reasonPriority;
    case "shortHanded":
      return `${r.spots} ${dict.match.reasonSpots}`;
    case "needsCovered":
      return `${r.covered}/${r.total} ${dict.match.reasonNeedsCovered}`;
  }
}
