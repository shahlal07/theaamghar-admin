'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import type { ProvinceShipping, ShippingZone } from '@/lib/queries/shipping';
import { updateZoneRate, addCityOverride, deleteCityOverride } from './actions';

function CityOverrideRow({ zone }: { zone: ShippingZone }) {
  const [rate, setRate] = useState(zone.rate);
  const [saveState, saveAction, savePending] = useActionState(updateZoneRate, undefined);
  const [delState, delAction, delPending] = useActionState(deleteCityOverride, undefined);

  useEffect(() => {
    if (saveState?.success) toast.success(`${zone.city} rate saved`);
    if (saveState?.error) toast.error(saveState.error);
  }, [saveState, zone.city]);

  useEffect(() => {
    if (delState?.success) toast.success(`${zone.city} override removed`);
    if (delState?.error) toast.error(delState.error);
  }, [delState, zone.city]);

  return (
    <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] py-2 pl-6 last:border-b-0">
      <span className="w-40 text-sm text-[var(--text)]">{zone.city}</span>
      <form
        action={(fd) => {
          fd.set('zoneId', zone.id);
          fd.set('rate', String(rate));
          saveAction(fd);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="number"
          min={0}
          step="1"
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
          className="w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
        <button
          type="submit"
          disabled={savePending}
          className="rounded-lg bg-[var(--mango-orange)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savePending ? 'Saving…' : 'Save'}
        </button>
      </form>
      <form action={delAction}>
        <input type="hidden" name="zoneId" value={zone.id} />
        <button
          type="submit"
          disabled={delPending}
          className="rounded-lg border border-[var(--error)] px-3 py-1.5 text-xs font-semibold text-[var(--error)] transition hover:bg-[var(--error)]/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Remove
        </button>
      </form>
    </div>
  );
}

function AddOverrideForm({ province }: { province: string }) {
  const [city, setCity] = useState('');
  const [rate, setRate] = useState(0);
  const [state, formAction, pending] = useActionState(addCityOverride, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success(`${city} override added`);
      // Resetting the form after a successful useActionState submission has
      // no callback-based alternative (the result is only observable via
      // re-render), so this effect is the correct place for it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCity('');
      setRate(0);
    }
    if (state?.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={(fd) => {
        fd.set('province', province);
        fd.set('city', city);
        fd.set('rate', String(rate));
        formAction(fd);
      }}
      className="flex items-center gap-2 pl-6 pt-2"
    >
      <input
        type="text"
        placeholder="City name"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        required
        className="w-40 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
      />
      <input
        type="number"
        min={0}
        step="1"
        placeholder="Rate"
        value={rate || ''}
        onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
        className="w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
      />
      <button
        type="submit"
        disabled={pending || !city}
        className="rounded-lg bg-[var(--orchard-green)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--orchard-light)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Adding…' : '+ Add City Override'}
      </button>
    </form>
  );
}

function ProvinceCard({ entry }: { entry: ProvinceShipping }) {
  const [rate, setRate] = useState(entry.defaultZone?.rate ?? 0);
  const [state, formAction, pending] = useActionState(updateZoneRate, undefined);

  useEffect(() => {
    if (state?.success) toast.success(`${entry.province} default saved`);
    if (state?.error) toast.error(state.error);
  }, [state, entry.province]);

  if (!entry.defaultZone) return null;

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--text)]">{entry.province}</h2>
        <form
          action={(fd) => {
            fd.set('zoneId', entry.defaultZone!.id);
            fd.set('rate', String(rate));
            formAction(fd);
          }}
          className="flex items-center gap-2"
        >
          <label className="text-xs text-[var(--text-light)]">Default rate</label>
          <input
            type="number"
            min={0}
            step="1"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
            className="w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-[var(--mango-orange)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>

      {entry.cityOverrides.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
            City overrides
          </p>
          {entry.cityOverrides.map((z) => (
            <CityOverrideRow key={z.id} zone={z} />
          ))}
        </div>
      )}

      <AddOverrideForm province={entry.province} />
    </div>
  );
}

export function ShippingClient({ zones }: { zones: ProvinceShipping[] }) {
  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 text-xs text-[var(--text-light)]">
        Every province has one default delivery rate. Add a city override to
        charge a different rate for a specific city within that province —
        the profit calculator uses the most specific match available.
      </p>
      {zones.map((entry) => (
        <ProvinceCard key={entry.province} entry={entry} />
      ))}
    </div>
  );
}
