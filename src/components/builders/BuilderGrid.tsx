import type { Builder, Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/config";
import { BuilderCard } from "./BuilderCard";
import { EmptyState } from "@/components/ui/EmptyState";

export function BuilderGrid({
  builders,
  dict,
  workingOn,
  locale,
}: {
  builders: Builder[];
  dict: Dictionary;
  workingOn: Map<string, { slug: string; name: string }[]>;
  locale: Locale;
}) {
  if (builders.length === 0) return <EmptyState title={dict.builders.empty} />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {builders.map((b) => (
        <BuilderCard
          key={b.id}
          builder={b}
          dict={dict}
          projects={workingOn.get(b.id) ?? []}
          locale={locale}
        />
      ))}
    </div>
  );
}
