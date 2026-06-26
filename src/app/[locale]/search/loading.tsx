import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

// Shown while search runs over the project set.
export default function SearchLoading() {
  return (
    <section className="flex flex-col gap-6">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}
