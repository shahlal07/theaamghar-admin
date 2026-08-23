export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-subtle)] px-6 py-12 text-center">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        width="32"
        height="32"
        className="mb-2 text-[var(--text-light)]"
        aria-hidden="true"
      >
        <path d="M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7" />
        <path d="M3 8l2-5h14l2 5" />
        <path d="M3 8h18v4a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2 2 2 0 0 0-2-2 2 2 0 0 0-2 2 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
      </svg>
      <div className="text-sm font-medium text-[var(--text)]">{title}</div>
      {description && (
        <div className="mt-1 max-w-xs text-xs text-[var(--text-light)]">
          {description}
        </div>
      )}
    </div>
  );
}
