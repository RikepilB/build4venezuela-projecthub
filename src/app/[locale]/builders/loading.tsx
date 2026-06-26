import { SkeletonGrid, SkeletonHeader, Skeleton } from "@/components/ui/Skeleton";

// Shown while the roster loads — notably the remote Google Sheet fetch on Vercel.
export default function BuildersLoading() {
  return (
    <section className="flex flex-col gap-6">
      <SkeletonHeader />
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-16 w-full" />
      <SkeletonGrid count={6} />
    </section>
  );
}
