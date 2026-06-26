import { ExternalLink } from "@/components/ui/ExternalLink";
import type { Resource } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";

// A verified relief resource: name + synopsis + a way to reach it (link OR a phone/
// account for offline channels) + who vouches for it. Link-out only — never a vote
// rail or "join", these are vetted things to USE, not hackathon projects to build.
export function ResourceCard({ resource, dict }: { resource: Resource; dict: Dictionary }) {
  return (
    <article className="flex flex-col gap-2 rounded-token border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-text">{resource.name}</h3>
        {resource.languages.length > 0 && (
          <span className="shrink-0 rounded-token border border-border px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted">
            {resource.languages.join(" / ")}
          </span>
        )}
      </div>

      {resource.summary && <p className="line-clamp-4 text-sm text-muted">{resource.summary}</p>}

      <div className="mt-auto flex flex-col gap-1 pt-2">
        {resource.url ? (
          <ExternalLink href={resource.url} className="text-sm font-medium">
            {dict.resources.visit}
          </ExternalLink>
        ) : resource.contact ? (
          <span className="text-sm font-medium text-text">{resource.contact}</span>
        ) : null}
        {resource.verified_source && (
          <span className="text-xs text-muted">
            {dict.resources.verifiedBy}: {resource.verified_source}
          </span>
        )}
      </div>
    </article>
  );
}
