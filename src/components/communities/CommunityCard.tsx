import { ExternalLink } from "@/components/ui/ExternalLink";
import type { Community } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";

// A public coordination space (Discord/WhatsApp/Telegram/web). Link-out only — these are
// standing entry points to join, never private one-off invites or hackathon projects.
export function CommunityCard({ community, dict }: { community: Community; dict: Dictionary }) {
  return (
    <article className="flex flex-col gap-2 rounded-token border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-text">{community.name}</h3>
        <span className="shrink-0 rounded-token border border-border px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted">
          {dict.communities.types[community.type]}
        </span>
      </div>

      {community.summary && <p className="line-clamp-4 text-sm text-muted">{community.summary}</p>}

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <ExternalLink href={community.url} className="text-sm font-medium">
          {dict.communities.visit}
        </ExternalLink>
        {community.languages.length > 0 && (
          <span className="text-xs uppercase tracking-wide text-muted">{community.languages.join(" / ")}</span>
        )}
      </div>
    </article>
  );
}
