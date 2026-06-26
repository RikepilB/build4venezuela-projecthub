// Minimalist, asset-free project image: a token-tinted gradient + a category glyph.
// Deterministic per category so cards read at a glance without external images.
const META: Record<string, { icon: string; tint: string }> = {
  "missing-persons": { icon: "🔎", tint: "from-danger/20" },
  shelter: { icon: "🏠", tint: "from-success/20" },
  "aid-center": { icon: "📦", tint: "from-success/20" },
  "needs-map": { icon: "🗺️", tint: "from-accent/20" },
  medical: { icon: "➕", tint: "from-danger/20" },
  transport: { icon: "🚐", tint: "from-accent/20" },
  translation: { icon: "🌐", tint: "from-accent/20" },
  coordination: { icon: "🧭", tint: "from-primary/20" },
  tracking: { icon: "📍", tint: "from-primary/20" },
};
const FALLBACK = { icon: "⭐", tint: "from-accent/20" };

export function ProjectThumb({ category }: { category?: string }) {
  const { icon, tint } = (category && META[category]) || FALLBACK;
  return (
    <div
      className={`flex h-20 items-center justify-center bg-linear-to-br ${tint} to-surface-2`}
      aria-hidden
    >
      <span className="text-3xl opacity-90">{icon}</span>
    </div>
  );
}
