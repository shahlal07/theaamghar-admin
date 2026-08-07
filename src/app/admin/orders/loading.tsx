import { Skeleton, TableSkeleton } from '@/components/admin/Skeleton';

export default function OrdersLoading() {
  return (
    <div>
      <Skeleton className="mb-1 h-8 w-32" />
      <Skeleton className="mb-6 h-4 w-72" />
      <TableSkeleton rows={8} />
    </div>
  );
}
