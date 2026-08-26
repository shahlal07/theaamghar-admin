'use client';

import { useEffect, useMemo, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import { calculateProfit } from '@/lib/profit';
import { formatPKR, formatPercent } from '@/lib/format';
import { normalizeProductModel } from '@/lib/product-types';
import type { ProductWithCosts, BusinessSettings } from '@/lib/queries/profit-calculator';
import type { ProvinceShipping } from '@/lib/queries/shipping';
import { saveCosts } from './actions';

// Mirrors src/lib/variant-label.ts on the storefront (label override, else
// join non-empty attribute values) so this dropdown reads the same as what
// customers see on the product page.
function variantDisplayLabel(v: { attributes: Record<string, unknown>; label: string | null }): string {
  if (v.label) return v.label;
  const values = Object.values(v.attributes).filter((x): x is string => typeof x === 'string' && x.length > 0);
  return values.length > 0 ? values.join(' / ') : 'Standard';
}

function resolveShippingRate(
  zones: ProvinceShipping[],
  province: string,
  city: string,
  fallback: number
): number {
  const entry = zones.find((z) => z.province === province);
  if (!entry) return fallback;
  const override = city ? entry.cityOverrides.find((o) => o.city === city) : undefined;
  return override?.rate ?? entry.defaultZone?.rate ?? fallback;
}

const BOX_SIZE_OPTIONS = [3, 5, 8, 10];

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--text-light)] uppercase tracking-wide">
        {label}
      </label>
      <input
        type="number"
        min={0}
        step="0.01"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)] focus:ring-2 focus:ring-[var(--mango-orange)]/20"
      />
    </div>
  );
}

function ResultRow({
  label,
  value,
  bold,
  positive,
}: {
  label: string;
  value: string;
  bold?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] py-2 last:border-b-0">
      <span className="text-sm text-[var(--text-light)]">{label}</span>
      <span
        className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${
          positive === true
            ? 'text-[var(--orchard-green)]'
            : positive === false
              ? 'text-[var(--error)]'
              : 'text-[var(--text)]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function ProfitCalculatorClient({
  products,
  settings,
  shippingZones,
}: {
  products: ProductWithCosts[];
  settings: BusinessSettings;
  shippingZones: ProvinceShipping[];
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const product = products.find((p) => p.id === productId) ?? products[0];
  // Drives which sub-unit selector shows (box size / variant / none) and
  // which cost column + selling-price source this calculator reads and
  // saves to -- previously hardcoded to weight_based (box_sizes) only, so
  // every variant_based/simple product (e.g. NIGEHBAAN's jackets) had no
  // box_sizes at all, the Save button stayed permanently disabled, and the
  // whole page was unusable for any non-fruit vendor.
  const model = normalizeProductModel(product?.product_type);

  const [boxSizeKg, setBoxSizeKg] = useState<number>(
    product?.box_sizes[0]?.box_size_kg ?? 5
  );
  const [variantId, setVariantId] = useState<string>(product?.variants[0]?.id ?? '');

  const [purchasePricePerKg, setPurchasePricePerKg] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [packagingBoxCost, setPackagingBoxCost] = useState(0);
  const [foamPaperCost, setFoamPaperCost] = useState(0);
  const [brandingStickerCost, setBrandingStickerCost] = useState(0);
  const [labourCost, setLabourCost] = useState(0);
  const [marketingCostPerOrder, setMarketingCostPerOrder] = useState(0);
  const [miscCost, setMiscCost] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [shippingCost, setShippingCost] = useState(settings.default_shipping_cost);
  const [gatewayFeePercent, setGatewayFeePercent] = useState(
    settings.payment_gateway_fee_percent
  );
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');

  const selectedProvinceEntry = shippingZones.find((z) => z.province === province);

  // Auto-fill shipping cost from the matched province/city rate whenever
  // the destination changes — still just a starting point, since the field
  // below stays editable for one-off "what-if" overrides. No callback-based
  // alternative exists for reacting to a derived selection change like this.
  useEffect(() => {
    if (!province) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShippingCost(
      resolveShippingRate(shippingZones, province, city, settings.default_shipping_cost)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [province, city]);

  // Re-hydrate the form whenever the selected product/box size/variant
  // changes.
  useEffect(() => {
    if (!product) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPurchasePricePerKg(product.purchase_price_per_kg ?? 0);
    setUnitCost(product.unit_cost ?? 0);
    setPackagingBoxCost(product.packaging_box_cost ?? 0);
    setFoamPaperCost(product.foam_paper_cost ?? 0);
    setBrandingStickerCost(product.branding_sticker_cost ?? 0);
    setLabourCost(product.labour_cost ?? 0);
    setMarketingCostPerOrder(product.marketing_cost_per_order ?? 0);
    setMiscCost(product.misc_cost ?? 0);
    if (model === 'weight_based') {
      const box = product.box_sizes.find((b) => b.box_size_kg === boxSizeKg);
      setSellingPrice(box?.selling_price ?? 0);
    } else if (model === 'variant_based') {
      const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
      setSellingPrice(variant?.selling_price ?? 0);
    } else {
      setSellingPrice(product.selling_price ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, boxSizeKg, variantId, model]);

  const activeBoxSize = product?.box_sizes.find((b) => b.box_size_kg === boxSizeKg);
  const activeVariant = product?.variants.find((v) => v.id === variantId);
  // What actually gets saved as the sub-unit id (null for 'simple', which
  // has no sub-unit row -- price lives on products.selling_price directly).
  const activeUnitId = model === 'weight_based' ? (activeBoxSize?.id ?? null) : model === 'variant_based' ? (activeVariant?.id ?? null) : null;

  const result = useMemo(
    () =>
      calculateProfit({
        productCost: model === 'weight_based' ? purchasePricePerKg * boxSizeKg : unitCost,
        sellingPrice,
        packagingBoxCost,
        foamPaperCost,
        brandingStickerCost,
        labourCost,
        shippingCost,
        marketingCostPerOrder,
        miscCost,
        paymentGatewayFeePercent: gatewayFeePercent,
      }),
    [
      model,
      boxSizeKg,
      unitCost,
      sellingPrice,
      purchasePricePerKg,
      packagingBoxCost,
      foamPaperCost,
      brandingStickerCost,
      labourCost,
      shippingCost,
      marketingCostPerOrder,
      miscCost,
      gatewayFeePercent,
    ]
  );

  const [state, formAction, pending] = useActionState(saveCosts, undefined);

  useEffect(() => {
    if (state?.success) toast.success('Costs saved');
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (!product) {
    return (
      <p className="text-sm text-[var(--text-light)]">
        Add a product first (Phase 6) before using the calculator.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-light)] uppercase tracking-wide">
              Product
            </label>
            <select
              value={productId}
              onChange={(e) => {
                const next = products.find((p) => p.id === e.target.value);
                setProductId(e.target.value);
                setBoxSizeKg(next?.box_sizes[0]?.box_size_kg ?? 5);
                setVariantId(next?.variants[0]?.id ?? '');
              }}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {model === 'weight_based' ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-light)] uppercase tracking-wide">
                Box Size
              </label>
              <select
                value={boxSizeKg}
                onChange={(e) => setBoxSizeKg(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
              >
                {BOX_SIZE_OPTIONS.map((kg) => (
                  <option key={kg} value={kg}>
                    {kg} kg
                    {!product.box_sizes.some((b) => b.box_size_kg === kg) ? ' (new)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : model === 'variant_based' ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-light)] uppercase tracking-wide">
                Variant
              </label>
              {product.variants.length === 0 ? (
                <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text-light)]">
                  No variants yet
                </p>
              ) : (
                <select
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
                >
                  {product.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {variantDisplayLabel(v)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : null}
        </div>

        <NumberField label="Selling Price (Rs)" value={sellingPrice} onChange={setSellingPrice} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-light)] uppercase tracking-wide">
              Destination Province
            </label>
            <select
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setCity('');
              }}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
            >
              <option value="">Use default shipping cost</option>
              {shippingZones.map((z) => (
                <option key={z.province} value={z.province}>
                  {z.province}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-light)] uppercase tracking-wide">
              City Override
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!selectedProvinceEntry || selectedProvinceEntry.cityOverrides.length === 0}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Province default</option>
              {selectedProvinceEntry?.cityOverrides.map((o) => (
                <option key={o.id} value={o.city!}>
                  {o.city}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {model === 'weight_based' ? (
            <NumberField
              label="Purchase Price / kg"
              value={purchasePricePerKg}
              onChange={setPurchasePricePerKg}
            />
          ) : (
            <NumberField label="Cost / Unit" value={unitCost} onChange={setUnitCost} />
          )}
          <NumberField
            label="Shipping Cost"
            value={shippingCost}
            onChange={setShippingCost}
          />
          <NumberField
            label="Packaging Box Cost"
            value={packagingBoxCost}
            onChange={setPackagingBoxCost}
          />
          <NumberField label="Foam/Paper Cost" value={foamPaperCost} onChange={setFoamPaperCost} />
          <NumberField
            label="Branding/Sticker Cost"
            value={brandingStickerCost}
            onChange={setBrandingStickerCost}
          />
          <NumberField label="Labour Cost" value={labourCost} onChange={setLabourCost} />
          <NumberField
            label="Marketing Cost / Order"
            value={marketingCostPerOrder}
            onChange={setMarketingCostPerOrder}
          />
          <NumberField label="Misc. Cost" value={miscCost} onChange={setMiscCost} />
          <NumberField
            label="Payment Gateway Fee %"
            value={gatewayFeePercent}
            onChange={setGatewayFeePercent}
          />
        </div>
        <p className="text-xs text-[var(--text-light)]">
          Shipping cost auto-fills from the selected destination&apos;s rate
          (or Settings&apos; default gateway fee %) but stays editable for
          this what-if calculation. Only product costs + selling price are
          saved by this page — manage rates and the gateway fee in Shipping
          and Settings.
        </p>

        <form
          action={(fd) => {
            fd.set('productId', product.id);
            fd.set('model', model);
            fd.set('unitId', activeUnitId ?? '');
            fd.set('sellingPrice', String(sellingPrice));
            fd.set('purchasePricePerKg', String(purchasePricePerKg));
            fd.set('unitCost', String(unitCost));
            fd.set('packagingBoxCost', String(packagingBoxCost));
            fd.set('foamPaperCost', String(foamPaperCost));
            fd.set('brandingStickerCost', String(brandingStickerCost));
            fd.set('labourCost', String(labourCost));
            fd.set('marketingCostPerOrder', String(marketingCostPerOrder));
            fd.set('miscCost', String(miscCost));
            formAction(fd);
          }}
        >
          {model === 'weight_based' && !activeBoxSize && (
            <p className="mb-2 text-xs text-[var(--error)]">
              This box size doesn&apos;t exist yet for this product — add it in
              Product Management before saving.
            </p>
          )}
          {model === 'variant_based' && !activeVariant && (
            <p className="mb-2 text-xs text-[var(--error)]">
              Add a variant for this product in Product Management before saving.
            </p>
          )}
          <button
            type="submit"
            disabled={pending || (model !== 'simple' && !activeUnitId)}
            className="w-full rounded-lg bg-[var(--mango-orange)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save Costs & Price'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">
          {product.name}
          {model === 'weight_based' && ` · ${boxSizeKg}kg box`}
          {model === 'variant_based' && activeVariant && ` · ${variantDisplayLabel(activeVariant)}`}
        </h2>
        <ResultRow label="Product Cost" value={formatPKR(result.productCost)} />
        <ResultRow label="Shipping Cost" value={formatPKR(result.shippingCost)} />
        <ResultRow label="Total Cost" value={formatPKR(result.totalCost)} bold />
        <ResultRow label="Payment Gateway Fee" value={formatPKR(result.paymentGatewayFee)} />
        <ResultRow label="Net Revenue" value={formatPKR(result.netRevenue)} />
        <ResultRow
          label="Profit"
          value={formatPKR(result.profit)}
          bold
          positive={result.profit >= 0}
        />
        <ResultRow
          label="Profit Margin"
          value={formatPercent(result.profitMarginPercent)}
          positive={result.profitMarginPercent >= 0}
        />
        <ResultRow
          label="Gross Margin"
          value={formatPercent(result.grossMarginPercent)}
          positive={result.grossMarginPercent >= 0}
        />
      </div>
    </div>
  );
}
