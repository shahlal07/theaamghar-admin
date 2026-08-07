'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import { calculateProfit } from '@/lib/profit';
import { formatPKR, formatPercent } from '@/lib/format';
import type { Variety, VarietyBoxSize } from '@/lib/queries/varieties';
import { updateVariety, updateBoxSize } from './actions';

function BoxSizeRow({
  boxSize,
  variety,
  gatewayFeePercent,
  defaultShippingCost,
}: {
  boxSize: VarietyBoxSize;
  variety: Variety;
  gatewayFeePercent: number;
  defaultShippingCost: number;
}) {
  const [sellingPrice, setSellingPrice] = useState(boxSize.selling_price);
  const [stockQty, setStockQty] = useState(boxSize.stock_qty);
  const [state, formAction, pending] = useActionState(updateBoxSize, undefined);

  useEffect(() => {
    if (state?.success) toast.success(`${variety.name} ${boxSize.box_size_kg}kg saved`);
    if (state?.error) toast.error(state.error);
  }, [state, variety.name, boxSize.box_size_kg]);

  const result = calculateProfit({
    productCost: (variety.purchase_price_per_kg ?? 0) * boxSize.box_size_kg,
    sellingPrice,
    packagingBoxCost: variety.packaging_box_cost ?? 0,
    foamPaperCost: variety.foam_paper_cost ?? 0,
    brandingStickerCost: variety.branding_sticker_cost ?? 0,
    labourCost: variety.labour_cost ?? 0,
    shippingCost: defaultShippingCost,
    marketingCostPerOrder: variety.marketing_cost_per_order ?? 0,
    miscCost: variety.misc_cost ?? 0,
    paymentGatewayFeePercent: gatewayFeePercent,
  });

  return (
    <form
      action={(fd) => {
        fd.set('boxSizeId', boxSize.id);
        fd.set('sellingPrice', String(sellingPrice));
        fd.set('stockQty', String(stockQty));
        formAction(fd);
      }}
      className="grid grid-cols-2 items-center gap-3 border-b border-[var(--border-subtle)] py-3 last:border-b-0 sm:grid-cols-5"
    >
      <div className="text-sm font-semibold text-[var(--text)]">
        {boxSize.box_size_kg} kg
        {!boxSize.active && (
          <span className="ml-2 rounded-full bg-[var(--surface-sunken)] px-2 py-0.5 text-xs font-normal text-[var(--text-light)]">
            inactive
          </span>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--text-light)]">Selling Price</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={sellingPrice}
          onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--text-light)]">Stock Qty</label>
        <input
          type="number"
          min={0}
          step="1"
          value={stockQty}
          onChange={(e) => setStockQty(parseInt(e.target.value, 10) || 0)}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
      </div>

      <div className="text-sm">
        <span className="text-[var(--text-light)]">Profit </span>
        <span
          className={`font-semibold ${
            result.profit >= 0 ? 'text-[var(--orchard-green)]' : 'text-[var(--error)]'
          }`}
        >
          {formatPKR(result.profit)}
        </span>
        <span className="ml-1 text-xs text-[var(--text-light)]">
          ({formatPercent(result.profitMarginPercent)})
        </span>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="justify-self-start rounded-lg bg-[var(--mango-orange)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60 sm:justify-self-end"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}

function VarietyCard({
  variety,
  gatewayFeePercent,
  defaultShippingCost,
}: {
  variety: Variety;
  gatewayFeePercent: number;
  defaultShippingCost: number;
}) {
  const [purchasePricePerKg, setPurchasePricePerKg] = useState(
    variety.purchase_price_per_kg ?? 0
  );
  const [isSeasonal, setIsSeasonal] = useState(variety.is_seasonal);
  const [harvestStart, setHarvestStart] = useState(variety.harvest_season_start ?? '');
  const [harvestEnd, setHarvestEnd] = useState(variety.harvest_season_end ?? '');
  const [state, formAction, pending] = useActionState(updateVariety, undefined);

  useEffect(() => {
    if (state?.success) toast.success(`${variety.name} saved`);
    if (state?.error) toast.error(state.error);
  }, [state, variety.name]);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-lg font-bold text-[var(--text)]">{variety.name}</h2>

        <form
          action={(fd) => {
            fd.set('productId', variety.id);
            fd.set('purchasePricePerKg', String(purchasePricePerKg));
            fd.set('isSeasonal', String(isSeasonal));
            fd.set('harvestSeasonStart', harvestStart);
            fd.set('harvestSeasonEnd', harvestEnd);
            formAction(fd);
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="mb-1 block text-xs text-[var(--text-light)]">
              Purchase Price / kg
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={purchasePricePerKg}
              onChange={(e) => setPurchasePricePerKg(parseFloat(e.target.value) || 0)}
              className="w-32 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
            />
          </div>

          <label className="flex items-center gap-2 pb-1.5 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={isSeasonal}
              onChange={(e) => setIsSeasonal(e.target.checked)}
              className="h-4 w-4 accent-[var(--mango-orange)]"
            />
            Seasonal
          </label>

          {isSeasonal && (
            <>
              <div>
                <label className="mb-1 block text-xs text-[var(--text-light)]">
                  Harvest Start
                </label>
                <input
                  type="date"
                  value={harvestStart}
                  onChange={(e) => setHarvestStart(e.target.value)}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--text-light)]">
                  Harvest End
                </label>
                <input
                  type="date"
                  value={harvestEnd}
                  onChange={(e) => setHarvestEnd(e.target.value)}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-[var(--orchard-green)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--orchard-light)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save Variety'}
          </button>
        </form>
      </div>

      {variety.box_sizes.length === 0 ? (
        <p className="text-sm text-[var(--text-light)]">
          No box sizes yet — add one in Product Management (Phase 6).
        </p>
      ) : (
        <div>
          {variety.box_sizes.map((bs) => (
            <BoxSizeRow
              key={bs.id}
              boxSize={bs}
              variety={variety}
              gatewayFeePercent={gatewayFeePercent}
              defaultShippingCost={defaultShippingCost}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function VarietiesClient({
  varieties,
  gatewayFeePercent,
  defaultShippingCost,
}: {
  varieties: Variety[];
  gatewayFeePercent: number;
  defaultShippingCost: number;
}) {
  if (varieties.length === 0) {
    return (
      <p className="text-sm text-[var(--text-light)]">
        No products yet — add one in Product Management (Phase 6).
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {varieties.map((v) => (
        <VarietyCard
          key={v.id}
          variety={v}
          gatewayFeePercent={gatewayFeePercent}
          defaultShippingCost={defaultShippingCost}
        />
      ))}
    </div>
  );
}
