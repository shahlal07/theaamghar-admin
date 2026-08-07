export function PlaceholderPage({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">{title}</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">{description}</p>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-16 text-center">
        <div className="mb-3 text-4xl">🚧</div>
        <div className="text-base font-semibold text-[var(--text)]">
          Coming in {phase}
        </div>
        <div className="mt-1 max-w-sm text-sm text-[var(--text-light)]">
          This section is being built next — the nav link is real, it just
          isn&apos;t wired up yet.
        </div>
      </div>
    </div>
  );
}
