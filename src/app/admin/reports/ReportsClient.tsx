'use client';

import { useState } from 'react';

function DownloadButtons({ href }: { href: string }) {
  return (
    <div className="flex gap-2">
      <a
        href={`${href}${href.includes('?') ? '&' : '?'}format=csv`}
        className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
      >
        CSV
      </a>
      <a
        href={`${href}${href.includes('?') ? '&' : '?'}format=xlsx`}
        className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
      >
        Excel
      </a>
      <a
        href={`${href}${href.includes('?') ? '&' : '?'}format=pdf`}
        className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
      >
        PDF
      </a>
    </div>
  );
}

function OrdersReportCard() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(today);

  const href = `/api/admin/reports/orders?${from ? `from=${from}&` : ''}to=${to}`;

  function applyPreset(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    setFrom(d.toISOString().slice(0, 10));
    setTo(today);
  }

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-bold text-[var(--text)]">Orders Report</h2>
      <p className="mb-4 text-sm text-[var(--text-light)]">
        Order number, customer, city, total, and status for the selected range.
      </p>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => applyPreset(7)}
            className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
          >
            Last 7 days
          </button>
          <button
            onClick={() => applyPreset(30)}
            className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
          >
            Last 30 days
          </button>
          <button
            onClick={() => applyPreset(365)}
            className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
          >
            Last year
          </button>
          <button
            onClick={() => setFrom('')}
            className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
          >
            All time
          </button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-[var(--text-light)]">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-light)]">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
          />
        </div>
      </div>
      <DownloadButtons href={href} />
    </div>
  );
}

export function ReportsClient() {
  return (
    <div className="space-y-6">
      <OrdersReportCard />

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-[var(--text)]">Products Report</h2>
        <p className="mb-4 text-sm text-[var(--text-light)]">
          Full catalog snapshot — pricing, stock, and status.
        </p>
        <DownloadButtons href="/api/admin/reports/products" />
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-[var(--text)]">Customers Report</h2>
        <p className="mb-4 text-sm text-[var(--text-light)]">
          Every customer with lifetime spend and order count.
        </p>
        <DownloadButtons href="/api/admin/reports/customers" />
      </div>
    </div>
  );
}
