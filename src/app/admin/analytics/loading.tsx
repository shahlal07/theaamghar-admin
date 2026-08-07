import { Skeleton, StatCardSkeleton, CardSkeleton } from '@/components/admin/Skeleton';

export default function AnalyticsLoading() {
  return (
    <div>
      <Skeleton className="mb-1 h-8 w-32" />
      <Skeleton className="mb-6 h-4 w-96" />
      <Skeleton className="mb-6 h-10 w-full max-w-2xl" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="mb-6">
        <CardSkeleton rows={5} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton rows={4} />
        <CardSkeleton rows={4} />
      </div>
    </div>
  );
}
