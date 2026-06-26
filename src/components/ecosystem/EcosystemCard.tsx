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
        <h3 className="font-semibold text-text">{project.name}</h3>
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
