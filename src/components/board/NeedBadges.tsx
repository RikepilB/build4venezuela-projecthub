import type { Locale, Needs } from "@/lib/types";
import { needTypes, labelFor } from "@/lib/taxonomy";

export function NeedBadges({ needs, locale }: { needs: Needs; locale: Locale }) {
  const active = needTypes.filter((n) => needs[n.id as keyof Needs]?.length > 0);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {active.map((n) => (
        <span
          key={n.id}
          className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
        >
          {labelFor(needTypes, n.id, locale)}
        </span>
      ))}
    </div>
  );
}
