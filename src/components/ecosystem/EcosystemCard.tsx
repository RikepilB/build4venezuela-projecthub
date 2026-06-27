import { SiteThumb } from "./SiteThumb";
import { ExternalLink } from "@/components/ui/ExternalLink";
import type { Project } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";

// An existing relief project: website image + name + brief synopsis + a link to visit.
// No vote rail / repo / details — this surface is "go use it", not "collaborate here".
export function EcosystemCard({ project, dict }: { project: Project; dict: Dictionary }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-token border border-border bg-surface">
      {project.demo_url && <SiteThumb url={project.demo_url} category={project.categories[0]} />}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-text">{project.name}</h3>
          <span className="inline-flex shrink-0 items-center rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
            {dict.ecosystem.live}
          </span>
        </div>
        <p className="line-clamp-3 text-sm text-muted">{project.summary}</p>
        {project.demo_url && (
          <div className="mt-auto pt-2">
            <ExternalLink href={project.demo_url} className="text-sm font-medium">
              {dict.ecosystem.visit}
            </ExternalLink>
          </div>
        )}
      </div>
    </article>
  );
}
