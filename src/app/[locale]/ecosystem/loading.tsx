import { SkeletonGrid, SkeletonHeader } from "@/components/ui/Skeleton";

export default function EcosystemLoading() {
  return (
    <section className="flex flex-col gap-6">
      <SkeletonHeader />
      <SkeletonGrid count={6} />
    </section>
  );
}
