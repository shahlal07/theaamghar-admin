'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/format';
import { ORDER_STATUSES } from '@/lib/order-status';
import { getOrderItemLabel } from '@/lib/order-item-label';
import type { OrderDetail } from '@/lib/queries/orders';
import { googleMapsUrl } from '@/lib/maps';
import { updateOrderStatus, updateOrderTracking } from './actions';
import { PaymentVerification } from './PaymentVerification';

function StatusForm({ order }: { order: OrderDetail }) {
  const [status, setStatus] = useState(order.status);
  const [state, formAction, pending] = useActionState(updateOrderStatus, undefined);

  useEffect(() => {
    if (state?.success) toast.success('Status updated');
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={(fd) => {
        fd.set('orderId', order.id);
        fd.set('status', status);
        formAction(fd);
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div>
        <label className="mb-1 block text-xs text-[var(--text-light)]">Order status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending || status === order.status}
        className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Update Status'}
      </button>
    </form>
  );
}

function TrackingForm({ order }: { order: OrderDetail }) {
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? '');
  const [courierName, setCourierName] = useState(order.courier_name ?? '');
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status ?? 'pending');
  const [state, formAction, pending] = useActionState(updateOrderTracking, undefined);

  useEffect(() => {
    if (state?.success) toast.success('Tracking info saved');
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={(fd) => {
        fd.set('orderId', order.id);
        fd.set('trackingNumber', trackingNumber);
        fd.set('courierName', courierName);
        fd.set('paymentStatus', paymentStatus);
        formAction(fd);
      }}
      className="grid gap-4 sm:grid-cols-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Courier
        </label>
        <input
          value={courierName}
          onChange={(e) => setCourierName(e.target.value)}
          placeholder="e.g. TCS, Leopards"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Tracking Number
        </label>
        <input
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Payment Status
        </label>
        <select
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        >
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>
      <div className="sm:col-span-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--orchard-green)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orchard-light)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save Tracking Info'}
        </button>
      </div>
    </form>
  );
}

export function OrderDetailClient({ order }: { order: OrderDetail }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Fulfillment</h2>
        <StatusForm order={order} />
      </div>

      <PaymentVerification order={order} />

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Shipping & Payment</h2>
        <TrackingForm order={order} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Items</h2>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-[var(--border-subtle)] py-2 text-sm last:border-b-0"
              >
                <div>
                  <p className="font-medium text-[var(--text)]">{item.name}</p>
                  <p className="text-xs text-[var(--text-light)]">
                    {getOrderItemLabel(item)} × {item.qty}
                  </p>
                </div>
                <p className="text-[var(--text)]">{formatPKR(item.unit_price * item.qty)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-[var(--border-subtle)] pt-3 text-sm">
            <div className="flex justify-between text-[var(--text-light)]">
              <span>Subtotal</span>
              <span>{formatPKR(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-light)]">
              <span>Shipping</span>
              <span>{formatPKR(order.shipping_fee)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-[var(--text-light)]">
                <span>Discount {order.discount_code ? `(${order.discount_code})` : ''}</span>
                <span>-{formatPKR(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[var(--text)]">
              <span>Total</span>
              <span>{formatPKR(order.total)}</span>
            </div>
            {order.platform_fee_amount > 0 && (
              <div className="flex justify-between text-[var(--text-light)]">
                <span>Nashemann platform fee</span>
                <span>-{formatPKR(order.platform_fee_amount)}</span>
              </div>
            )}
            {order.profit !== null && (
              <div className="flex justify-between text-[var(--orchard-green)]">
                <span>Profit (snapshot)</span>
                <span>{formatPKR(order.profit)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-[var(--text)]">Delivery</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--text-light)]">Name</dt>
              <dd className="text-[var(--text)]">{order.delivery.full_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-light)]">Phone</dt>
              <dd className="text-[var(--text)]">{order.delivery.phone}</dd>
            </div>
            {order.customer_email && (
              <div className="flex justify-between">
                <dt className="text-[var(--text-light)]">Email</dt>
                <dd className="text-[var(--text)]">{order.customer_email}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-[var(--text-light)]">City</dt>
              <dd className="text-[var(--text)]">{order.delivery.city}</dd>
            </div>
            <div>
              <dt className="mb-1 text-[var(--text-light)]">Address</dt>
              <dd className="text-[var(--text)]">{order.delivery.address}</dd>
              <a
                href={googleMapsUrl(order.delivery.address, order.delivery.city)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs font-semibold text-[var(--mango-orange)]"
              >
                View on Google Maps ↗
              </a>
            </div>
            {order.delivery.notes && (
              <div>
                <dt className="mb-1 text-[var(--text-light)]">Notes</dt>
                <dd className="text-[var(--text)]">{order.delivery.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
