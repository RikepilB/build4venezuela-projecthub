import { Skeleton } from "@/components/ui/Skeleton";

// Shown while a project detail loads.
export default function ProjectLoading() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-20" />
      </div>
      <Skeleton className="h-24 w-full" />
    </section>
  );
}
