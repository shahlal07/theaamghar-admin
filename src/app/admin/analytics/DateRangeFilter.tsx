'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '365 days', days: 365 },
];

export function DateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function applyPreset(days: number) {
    const params = new URLSearchParams(searchParams);
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    params.set('from', fromDate.toISOString().slice(0, 10));
    params.set('to', toDate.toISOString().slice(0, 10));
    router.push(`/admin/analytics?${params.toString()}`);
  }

  function applyCustom() {
    const params = new URLSearchParams(searchParams);
    params.set('from', customFrom);
    params.set('to', customTo);
    router.push(`/admin/analytics?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => applyPreset(p.days)}
            className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-[var(--text-light)]">From</label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-light)]">To</label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
          />
        </div>
        <button
          onClick={applyCustom}
          className="rounded-lg bg-[var(--mango-orange)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--mango-deep)]"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
