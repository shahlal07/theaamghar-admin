import { Skeleton, TableSkeleton } from '@/components/admin/Skeleton';

export default function CustomersLoading() {
  return (
    <div>
      <Skeleton className="mb-1 h-8 w-40" />
      <Skeleton className="mb-6 h-4 w-72" />
      <TableSkeleton rows={6} />
    </div>
  );
}
