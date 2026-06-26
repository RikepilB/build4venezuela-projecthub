import Link from "next/link";
import type { Builder, Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/href";
import { Tag } from "@/components/ui/Tag";
import { ExternalLink } from "@/components/ui/ExternalLink";

export function BuilderCard({
  builder,
  dict,
  projects,
  locale,
}: {
  builder: Builder;
  dict: Dictionary;
  projects: { slug: string; name: string }[];
  locale: Locale;
}) {
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

      {projects.length > 0 && (
        <p className="text-xs text-muted">
          <span className="font-medium text-text">{dict.builders.workingOn}: </span>
          {projects.map((p, i) => (
            <span key={p.slug}>
              {i > 0 ? ", " : ""}
              <Link href={localePath(locale, `/projects/${p.slug}`)} className="text-primary hover:underline">
                {p.name}
              </Link>
            </span>
          ))}
        </p>
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
        <ExternalLink href={builder.linkedin_url} className="text-sm font-medium">
          {dict.builders.profile}
        </ExternalLink>
      ) : null}
    </article>
  );
}
