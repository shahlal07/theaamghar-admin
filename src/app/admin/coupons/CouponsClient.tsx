'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/format';
import type { Coupon } from '@/lib/queries/coupons';
import { createCoupon, updateCoupon, toggleCouponActive, deleteCoupon } from './actions';

const inputClass =
  'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]';

function toDateInputValue(v: string | null): string {
  if (!v) return '';
  return v.slice(0, 10);
}

function CouponFormFields({
  code,
  setCode,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  minOrderAmount,
  setMinOrderAmount,
  maxUses,
  setMaxUses,
  startsAt,
  setStartsAt,
  expiresAt,
  setExpiresAt,
}: {
  code: string;
  setCode: (v: string) => void;
  discountType: string;
  setDiscountType: (v: string) => void;
  discountValue: number;
  setDiscountValue: (v: number) => void;
  minOrderAmount: number;
  setMinOrderAmount: (v: number) => void;
  maxUses: number | '';
  setMaxUses: (v: number | '') => void;
  startsAt: string;
  setStartsAt: (v: string) => void;
  expiresAt: string;
  setExpiresAt: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Code
        </label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. MANGO10"
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Type
        </label>
        <select
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value)}
          className={inputClass}
        >
          <option value="percent">Percent off</option>
          <option value="fixed">Fixed amount off</option>
          <option value="free_shipping">Free shipping</option>
        </select>
      </div>
      {discountType !== 'free_shipping' && (
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
            {discountType === 'percent' ? 'Percent (%)' : 'Amount (Rs)'}
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={discountValue}
            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Min. order amount (Rs)
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={minOrderAmount}
          onChange={(e) => setMinOrderAmount(parseFloat(e.target.value) || 0)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Max uses (blank = unlimited)
        </label>
        <input
          type="number"
          min={1}
          step="1"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Starts (optional)
        </label>
        <input
          type="date"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Expires (optional)
        </label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className={inputClass}
        />
      </div>
    </div>
  );
}

function NewCouponForm() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState(10);
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [state, formAction, pending] = useActionState(createCoupon, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success('Coupon created');
      // Resetting the form after a successful useActionState submission has
      // no callback-based alternative (the action result is only observable
      // via re-render), so this effect is the correct place for it despite
      // the lint rule's general "avoid setState in effects" guidance.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCode('');
      setDiscountValue(10);
      setMinOrderAmount(0);
      setMaxUses('');
      setStartsAt('');
      setExpiresAt('');
      setOpen(false);
    }
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)]"
      >
        + New Coupon
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        fd.set('code', code);
        fd.set('discountType', discountType);
        fd.set('discountValue', String(discountValue));
        fd.set('minOrderAmount', String(minOrderAmount));
        fd.set('maxUses', maxUses === '' ? '' : String(maxUses));
        fd.set('active', 'true');
        fd.set('startsAt', startsAt);
        fd.set('expiresAt', expiresAt);
        formAction(fd);
      }}
      className="mb-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-bold text-[var(--text)]">New Coupon</h2>
      <CouponFormFields
        code={code}
        setCode={setCode}
        discountType={discountType}
        setDiscountType={setDiscountType}
        discountValue={discountValue}
        setDiscountValue={setDiscountValue}
        minOrderAmount={minOrderAmount}
        setMinOrderAmount={setMinOrderAmount}
        maxUses={maxUses}
        setMaxUses={setMaxUses}
        startsAt={startsAt}
        setStartsAt={setStartsAt}
        expiresAt={expiresAt}
        setExpiresAt={setExpiresAt}
      />
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={pending || !code}
          className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create Coupon'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function CouponRow({ coupon }: { coupon: Coupon }) {
  // Lazy initializer so Date.now() runs once at mount, not on every render
  // (calling it directly in the render body would violate component purity).
  const [now] = useState(() => Date.now());
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(coupon.code);
  const [discountType, setDiscountType] = useState<string>(coupon.discount_type);
  const [discountValue, setDiscountValue] = useState(coupon.discount_value);
  const [minOrderAmount, setMinOrderAmount] = useState(coupon.min_order_amount);
  const [maxUses, setMaxUses] = useState<number | ''>(coupon.max_uses ?? '');
  const [startsAt, setStartsAt] = useState(toDateInputValue(coupon.starts_at));
  const [expiresAt, setExpiresAt] = useState(toDateInputValue(coupon.expires_at));

  const [updateState, updateAction, updatePending] = useActionState(updateCoupon, undefined);
  const [toggleState, toggleAction, togglePending] = useActionState(toggleCouponActive, undefined);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCoupon, undefined);

  useEffect(() => {
    if (updateState?.success) {
      toast.success('Coupon saved');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see NewCouponForm's effect above for rationale
      setEditing(false);
    }
    if (updateState?.error) toast.error(updateState.error);
  }, [updateState]);

  useEffect(() => {
    if (toggleState?.success) toast.success('Coupon updated');
    if (toggleState?.error) toast.error(toggleState.error);
  }, [toggleState]);

  useEffect(() => {
    if (deleteState?.success) toast.success('Coupon deleted');
    if (deleteState?.error) toast.error(deleteState.error);
  }, [deleteState]);

  const isExpired = coupon.expires_at ? new Date(coupon.expires_at).getTime() < now : false;
  const isExhausted = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses;

  const valueLabel =
    coupon.discount_type === 'percent'
      ? `${coupon.discount_value}% off`
      : coupon.discount_type === 'fixed'
        ? `${formatPKR(coupon.discount_value)} off`
        : 'Free shipping';

  if (editing) {
    return (
      <form
        action={(fd) => {
          fd.set('couponId', coupon.id);
          fd.set('code', code);
          fd.set('discountType', discountType);
          fd.set('discountValue', String(discountValue));
          fd.set('minOrderAmount', String(minOrderAmount));
          fd.set('maxUses', maxUses === '' ? '' : String(maxUses));
          fd.set('active', String(coupon.active));
          fd.set('startsAt', startsAt);
          fd.set('expiresAt', expiresAt);
          updateAction(fd);
        }}
        className="border-b border-[var(--border-subtle)] py-4 last:border-b-0"
      >
        <CouponFormFields
          code={code}
          setCode={setCode}
          discountType={discountType}
          setDiscountType={setDiscountType}
          discountValue={discountValue}
          setDiscountValue={setDiscountValue}
          minOrderAmount={minOrderAmount}
          setMinOrderAmount={setMinOrderAmount}
          maxUses={maxUses}
          setMaxUses={setMaxUses}
          startsAt={startsAt}
          setStartsAt={setStartsAt}
          expiresAt={expiresAt}
          setExpiresAt={setExpiresAt}
        />
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={updatePending}
            className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updatePending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] py-4 last:border-b-0">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-[var(--text)]">{coupon.code}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              coupon.active && !isExpired && !isExhausted
                ? 'bg-[var(--orchard-green)]/15 text-[var(--orchard-green)]'
                : 'bg-[var(--error)]/15 text-[var(--error)]'
            }`}
          >
            {!coupon.active
              ? 'inactive'
              : isExpired
                ? 'expired'
                : isExhausted
                  ? 'exhausted'
                  : 'active'}
          </span>
        </div>
        <p className="text-sm text-[var(--text-light)]">
          {valueLabel}
          {coupon.min_order_amount > 0 && ` · min ${formatPKR(coupon.min_order_amount)}`}
          {' · used '}
          {coupon.used_count}
          {coupon.max_uses !== null ? `/${coupon.max_uses}` : ''}
          {coupon.expires_at &&
            ` · expires ${new Date(coupon.expires_at).toLocaleDateString('en-PK')}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
        >
          Edit
        </button>
        <form action={toggleAction}>
          <input type="hidden" name="couponId" value={coupon.id} />
          <input type="hidden" name="active" value={String(!coupon.active)} />
          <button
            type="submit"
            disabled={togglePending}
            className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {coupon.active ? 'Deactivate' : 'Activate'}
          </button>
        </form>
        <form action={deleteAction}>
          <input type="hidden" name="couponId" value={coupon.id} />
          <button
            type="submit"
            disabled={deletePending}
            className="rounded-lg border border-[var(--error)] px-3 py-1.5 text-xs font-semibold text-[var(--error)] transition hover:bg-[var(--error)]/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}

export function CouponsClient({ coupons }: { coupons: Coupon[] }) {
  return (
    <div>
      <div className="mb-6">
        <NewCouponForm />
      </div>
      {coupons.length === 0 ? (
        <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 text-sm text-[var(--text-light)] shadow-sm">
          No coupons yet — create your first one above.
        </p>
      ) : (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          {coupons.map((c) => (
            <CouponRow key={c.id} coupon={c} />
          ))}
        </div>
      )}
    </div>
  );
}
