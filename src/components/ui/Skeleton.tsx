// Tokens-only skeleton primitives (no hardcoded colors). Used by route loading.tsx
// boundaries so the slowest async pages (board double-load, builders remote sheet
// fetch) show structure instantly instead of a blank screen.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-token bg-surface-2 ${className}`} aria-hidden />;
}

// A card-shaped placeholder matching the board/ecosystem grid tiles.
export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-token border border-border bg-surface p-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}

// A grid of skeleton cards. `count` defaults to a typical first-paint page.
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Page header placeholder (eyebrow + title + subtitle).
export function SkeletonHeader() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
