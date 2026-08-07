import { Skeleton, StatCardSkeleton, CardSkeleton } from '@/components/admin/Skeleton';

export default function DashboardLoading() {
  return (
    <div>
      <Skeleton className="mb-1 h-8 w-48" />
      <Skeleton className="mb-6 h-4 w-64" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="mb-6">
        <CardSkeleton rows={5} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <CardSkeleton rows={4} />
        <CardSkeleton rows={4} />
        <CardSkeleton rows={4} />
      </div>
    </div>
  );
}
