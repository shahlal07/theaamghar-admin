'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import type { InventoryUnit, AuditLogEntry, StockState } from '@/lib/queries/inventory';
import { adjustStock, updateThreshold } from './actions';

const STATE_LABEL: Record<StockState, string> = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
};

const STATE_CLASS: Record<StockState, string> = {
  in_stock: 'bg-[var(--orchard-green)]/15 text-[var(--orchard-green)]',
  low_stock: 'bg-[var(--golden)]/25 text-[#8a6d00]',
  out_of_stock: 'bg-[var(--error)]/15 text-[var(--error)]',
};

const REASON_LABEL: Record<string, string> = {
  manual_adjustment: 'Manual adjustment',
  order_placed: 'Order placed',
  order_cancelled: 'Order cancelled',
  order_refunded: 'Order refunded',
  restock: 'Restock',
};

function InventoryRow({ item }: { item: InventoryUnit }) {
  const [delta, setDelta] = useState(0);
  const [note, setNote] = useState('');
  const [threshold, setThreshold] = useState(item.low_stock_threshold);

  const [adjustState, adjustAction, adjustPending] = useActionState(adjustStock, undefined);
  const [thresholdState, thresholdAction, thresholdPending] = useActionState(
    updateThreshold,
    undefined
  );

  useEffect(() => {
    if (adjustState?.success) {
      toast.success(`${item.product_name} ${item.label} stock updated`);
      // Resetting the form after a successful useActionState submission has
      // no callback-based alternative (the result is only observable via
      // re-render), so this effect is the correct place for it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDelta(0);
      setNote('');
    }
    if (adjustState?.error) toast.error(adjustState.error);
  }, [adjustState, item.product_name, item.label]);

  useEffect(() => {
    if (thresholdState?.success) toast.success('Threshold saved');
    if (thresholdState?.error) toast.error(thresholdState.error);
  }, [thresholdState]);

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-[var(--border-subtle)] py-4 last:border-b-0 sm:grid-cols-[1fr_auto]">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="font-semibold text-[var(--text)]">
            {item.product_name} · {item.label}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_CLASS[item.state]}`}
          >
            {STATE_LABEL[item.state]}
          </span>
          {!item.active && (
            <span className="rounded-full bg-[var(--surface-sunken)] px-2 py-0.5 text-xs text-[var(--text-light)]">
              inactive
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--text-light)]">
          Current stock: <span className="font-medium text-[var(--text)]">{item.stock_qty}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <form
          action={(fd) => {
            fd.set('unitId', item.id);
            fd.set('source', item.source);
            fd.set('delta', String(delta));
            fd.set('note', note);
            adjustAction(fd);
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <div>
            <label className="mb-1 block text-xs text-[var(--text-light)]">
              Adjust (+/-)
            </label>
            <input
              type="number"
              step="1"
              value={delta || ''}
              onChange={(e) => setDelta(parseInt(e.target.value, 10) || 0)}
              placeholder="0"
              className="w-24 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-light)]">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason (optional)"
              className="w-40 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
            />
          </div>
          <button
            type="submit"
            disabled={adjustPending || delta === 0}
            className="rounded-lg bg-[var(--mango-orange)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adjustPending ? 'Saving…' : 'Apply'}
          </button>
        </form>

        <form
          action={(fd) => {
            fd.set('unitId', item.id);
            fd.set('source', item.source);
            fd.set('threshold', String(threshold));
            thresholdAction(fd);
          }}
          className="flex items-end gap-2"
        >
          <div>
            <label className="mb-1 block text-xs text-[var(--text-light)]">
              Low-stock threshold
            </label>
            <input
              type="number"
              min={0}
              step="1"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10) || 0)}
              className="w-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
            />
          </div>
          <button
            type="submit"
            disabled={thresholdPending}
            className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {thresholdPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[var(--text-light)]">
        No stock changes yet — adjustments and order-driven changes will show up here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-xs uppercase tracking-wide text-[var(--text-light)]">
            <th className="py-2 pr-4">When</th>
            <th className="py-2 pr-4">Product</th>
            <th className="py-2 pr-4">Reason</th>
            <th className="py-2 pr-4">Change</th>
            <th className="py-2 pr-4">Before → After</th>
            <th className="py-2">Note</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
              <td className="py-2 pr-4 whitespace-nowrap text-[var(--text-light)]">
                {new Date(e.created_at).toLocaleString('en-PK')}
              </td>
              <td className="py-2 pr-4 text-[var(--text)]">
                {e.product_name} · {e.label}
              </td>
              <td className="py-2 pr-4 text-[var(--text)]">
                {REASON_LABEL[e.reason] ?? e.reason}
              </td>
              <td
                className={`py-2 pr-4 font-medium ${
                  e.change_qty >= 0 ? 'text-[var(--orchard-green)]' : 'text-[var(--error)]'
                }`}
              >
                {e.change_qty >= 0 ? `+${e.change_qty}` : e.change_qty}
              </td>
              <td className="py-2 pr-4 text-[var(--text-light)]">
                {e.previous_qty} → {e.new_qty}
              </td>
              <td className="py-2 text-[var(--text-light)]">{e.note ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InventoryClient({
  units,
  auditLog,
}: {
  units: InventoryUnit[];
  auditLog: AuditLogEntry[];
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-bold text-[var(--text)]">Stock Levels</h2>
        {units.length === 0 ? (
          <p className="text-sm text-[var(--text-light)]">
            No box sizes or variants yet — add some in Product Management.
          </p>
        ) : (
          units.map((item) => <InventoryRow key={item.id} item={item} />)
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Recent Stock Activity</h2>
        <AuditLogTable entries={auditLog} />
      </div>
    </div>
  );
}
