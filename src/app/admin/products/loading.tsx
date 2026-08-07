import { Skeleton, TableSkeleton } from '@/components/admin/Skeleton';

export default function ProductsLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="mb-1 h-8 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
