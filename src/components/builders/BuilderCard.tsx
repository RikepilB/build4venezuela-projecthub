import type { Builder } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { Tag } from "@/components/ui/Tag";

const REL = "noopener noreferrer nofollow";

export function BuilderCard({ builder, dict }: { builder: Builder; dict: Dictionary }) {
  return (
    <article className="flex h-full flex-col gap-2 rounded-token border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-text">{builder.alias}</p>
        {builder.status ? <span className="text-xs text-muted">{builder.status}</span> : null}
      </div>
      {builder.role ? <p className="text-sm text-muted">{builder.role}</p> : null}
      {builder.stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {builder.stack.slice(0, 8).map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
        </div>
      )}
      <dl className="mt-auto grid grid-cols-1 gap-1 text-xs text-muted sm:grid-cols-2">
        <div>
          <dt className="inline font-medium">{dict.builders.availability}: </dt>
          <dd className="inline">{builder.availability || "—"}</dd>
        </div>
        <div>
          <dt className="inline font-medium">{dict.builders.timezone}: </dt>
          <dd className="inline">{builder.timezone || "—"}</dd>
        </div>
      </dl>
      {builder.linkedin_url ? (
        <a
          href={builder.linkedin_url}
          target="_blank"
          rel={REL}
          className="text-sm font-medium text-primary hover:underline"
        >
          {dict.builders.profile} →
        </a>
      ) : null}
    </article>
  );
}
