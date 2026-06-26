import type { Dictionary } from "@/lib/i18n/config";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { BUILD4VENEZUELA_PROJECTS_URL } from "@/lib/links";

// One open invitation at the top of the board — not a publish button on every card.
// Anyone can join, reuse, or publish, and decide for themselves.
export function BoardCallout({ dict }: { dict: Dictionary }) {
  return (
    <div className="flex flex-col gap-3 rounded-token border border-primary/40 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-text">{dict.board.calloutTitle}</p>
        <p className="text-sm text-muted">{dict.board.calloutBody}</p>
      </div>
      <ExternalLink href={BUILD4VENEZUELA_PROJECTS_URL} className="shrink-0 font-medium">
        {dict.board.calloutLink}
      </ExternalLink>
    </div>
  );
}
