import { ExternalLink } from "@/components/ui/ExternalLink";
import type { ReferenceProject } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";

// Open-source prior art worth reusing before building from scratch. Link-out only to the
// repo — name + what it does + stack + license, so a builder can evaluate it fast.
export function ReferenceCard({ project, dict }: { project: ReferenceProject; dict: Dictionary }) {
  return (
    <article className="flex flex-col gap-2 rounded-token border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-text">{project.name}</h3>
        {project.license && (
          <span className="shrink-0 rounded-token border border-border px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted">
            {project.license}
          </span>
        )}
      </div>

      <p className="line-clamp-4 text-sm text-muted">{project.summary}</p>

      {project.stack.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.stack.map((s) => (
            <span key={s} className="rounded-token bg-surface-2 px-1.5 py-0.5 text-[0.65rem] font-medium text-muted">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-2">
        <ExternalLink href={project.repo_url} className="text-sm font-medium">
          {dict.reference.visit}
        </ExternalLink>
      </div>
    </article>
  );
}
