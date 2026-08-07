export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-subtle)] px-6 py-12 text-center">
      <div className="mb-2 text-3xl">🥭</div>
      <div className="text-sm font-medium text-[var(--text)]">{title}</div>
      {description && (
        <div className="mt-1 max-w-xs text-xs text-[var(--text-light)]">
          {description}
        </div>
      )}
    </div>
  );
}
