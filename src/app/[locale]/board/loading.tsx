import { SkeletonGrid, SkeletonHeader, Skeleton } from "@/components/ui/Skeleton";

// Shown while the board loads (projects + votes overlay). Mirrors the final layout:
// header · stats strip · filter bar · card grid.
export default function BoardLoading() {
  return (
    <section className="flex flex-col gap-6">
      <SkeletonHeader />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-14 w-full" />
      <SkeletonGrid count={6} />
    </section>
  );
}
