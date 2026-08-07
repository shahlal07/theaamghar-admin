export function StatCard({
  label,
  value,
  hint,
  accent = 'orange',
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'orange' | 'green' | 'blue' | 'gold' | 'red';
}) {
  const dot: Record<string, string> = {
    orange: 'bg-[var(--mango-orange)]',
    green: 'bg-[var(--orchard-green)]',
    blue: 'bg-blue-500',
    gold: 'bg-[var(--golden)]',
    red: 'bg-[var(--error)]',
  };

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot[accent]}`} />
        <span className="text-xs font-medium tracking-wide text-[var(--text-light)] uppercase">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-[var(--text)]">{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--text-light)]">{hint}</div>}
    </div>
  );
}
