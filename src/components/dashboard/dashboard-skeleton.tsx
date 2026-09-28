import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
        <Skeleton className="h-[34rem] rounded-card" />
      </div>
    </div>
  );
}
