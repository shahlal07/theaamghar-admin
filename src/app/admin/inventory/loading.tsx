import { Skeleton, CardSkeleton } from '@/components/admin/Skeleton';

export default function InventoryLoading() {
  return (
    <div>
      <Skeleton className="mb-1 h-8 w-32" />
      <Skeleton className="mb-6 h-4 w-96" />
      <div className="space-y-6">
        <CardSkeleton rows={6} />
        <CardSkeleton rows={4} />
      </div>
    </div>
  );
}
