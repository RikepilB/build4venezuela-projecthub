import { membershipRepository } from "@/lib/repository";
import type { Dictionary } from "@/lib/i18n/config";
import { JoinProjectForm } from "./JoinProjectForm";

// Server component: loads the project's team, then lets anyone add their name.
export async function ProjectTeam({ slug, dict }: { slug: string; dict: Dictionary }) {
  const team = await membershipRepository.forProject(slug);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-text">
        {dict.detail.team}
        {team.length > 0 ? <span className="text-muted"> ({team.length})</span> : null}
      </h2>

      {team.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {team.map((m, i) => (
            <li
              key={`${m.name}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm text-text"
            >
              <span aria-hidden>👤</span>
              <span className="font-medium">{m.name}</span>
              {m.role ? <span className="text-muted">· {m.role}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{dict.detail.teamEmpty}</p>
      )}

      <JoinProjectForm slug={slug} dict={dict} />
    </section>
  );
}
