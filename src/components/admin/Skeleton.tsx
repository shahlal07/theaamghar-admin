export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[var(--surface-sunken)] ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-7 w-20" />
    </div>
  );
}

export function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <Skeleton className="mb-4 h-8 w-full max-w-sm" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
