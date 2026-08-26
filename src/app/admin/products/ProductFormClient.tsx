'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import Image from 'next/image';
import type { ProductDetail, ProductBoxSizeInput, ProductVariantInput, Category } from '@/lib/queries/products';
import {
  normalizeProductModel,
  productLevelFields,
  type CategorySchema,
} from '@/lib/product-types';
import { createProduct, updateProduct, uploadProductImages, deleteProductImage } from './actions';
import { getAddonGroups, slugifyAddonId, type AddonGroup } from '@/lib/product-addons';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--text-light)] uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)] focus:ring-2 focus:ring-[var(--mango-orange)]/20';

let boxSizeCounter = 0;
function nextKey() {
  boxSizeCounter += 1;
  return `new-${boxSizeCounter}`;
}

type BoxSizeRow = ProductBoxSizeInput & { key: string };
type VariantRow = ProductVariantInput & { key: string };
type AddonGroupRow = AddonGroup & { key: string };

export function ProductFormClient({
  product,
  categories,
  categorySchema,
}: {
  product: ProductDetail | null;
  categories: Category[];
  categorySchema: CategorySchema;
}) {
  const isEdit = product !== null;
  const model = categorySchema.model;
  const fields = useMemo(() => productLevelFields(categorySchema), [categorySchema]);

  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '');
  const [unitCost, setUnitCost] = useState(product?.unit_cost ?? 0);

  const [attrs, setAttrs] = useState<Record<string, string>>(() => {
    const existing = (product?.attributes ?? {}) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const f of fields) {
      const legacyValue =
        f.label.toLowerCase() === 'origin'
          ? product?.origin
          : f.label.toLowerCase() === 'season'
            ? product?.season
            : f.label.toLowerCase() === 'sweetness'
              ? product?.sweetness
              : f.label.toLowerCase() === 'fiber'
                ? product?.fiber
                : undefined;
      const value = legacyValue ?? existing[f.key];
      out[f.key] = typeof value === 'string' ? value : '';
    }
    return out;
  });

  // Retyping is blocked server-side too (actions.ts) -- this is the
  // UI-level mirror so the mistake gets caught before a wasted round trip.
  // It can now only fire when the superadmin reassigns this vendor's
  // category to one with a different model after products already exist.
  const productModel = isEdit ? normalizeProductModel(product.product_type) : model;
  const modelMismatch = isEdit && productModel !== model;
  const canSubmit =
    !modelMismatch ||
    ((product?.box_sizes.length ?? 0) === 0 &&
      (product?.variants.length ?? 0) === 0 &&
      !product?.has_order_history);

  const [tagline, setTagline] = useState(product?.tagline ?? '');
  const [weightNote, setWeightNote] = useState(product?.weight_note ?? '');
  const [discountPrice, setDiscountPrice] = useState<number | ''>(product?.discount_price ?? '');
  const [status, setStatus] = useState(product?.status ?? 'draft');
  const [sortOrder, setSortOrder] = useState(product?.sort_order ?? 0);
  const [descriptionText, setDescriptionText] = useState(
    (product?.description ?? []).join('\n')
  );

  const [purchasePricePerKg, setPurchasePricePerKg] = useState(
    product?.purchase_price_per_kg ?? 0
  );
  const [packagingBoxCost, setPackagingBoxCost] = useState(product?.packaging_box_cost ?? 0);
  const [foamPaperCost, setFoamPaperCost] = useState(product?.foam_paper_cost ?? 0);
  const [brandingStickerCost, setBrandingStickerCost] = useState(
    product?.branding_sticker_cost ?? 0
  );
  const [labourCost, setLabourCost] = useState(product?.labour_cost ?? 0);
  const [marketingCostPerOrder, setMarketingCostPerOrder] = useState(
    product?.marketing_cost_per_order ?? 0
  );
  const [miscCost, setMiscCost] = useState(product?.misc_cost ?? 0);
  const [isSeasonal, setIsSeasonal] = useState(product?.is_seasonal ?? true);
  const [harvestStart, setHarvestStart] = useState(product?.harvest_season_start ?? '');
  const [harvestEnd, setHarvestEnd] = useState(product?.harvest_season_end ?? '');

  const [sellingPrice, setSellingPrice] = useState(product?.selling_price ?? 0);
  const [stockQty, setStockQty] = useState(product?.stock_qty ?? 0);
  const [lowStockThreshold, setLowStockThreshold] = useState(product?.low_stock_threshold ?? 5);

  const [image, setImage] = useState<string | null>(product?.image ?? null);
  const [gallery, setGallery] = useState<string[]>(product?.gallery ?? []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [boxSizes, setBoxSizes] = useState<BoxSizeRow[]>(
    (product?.box_sizes ?? []).map((b) => ({ ...b, key: b.id ?? nextKey() }))
  );
  const [variants, setVariants] = useState<VariantRow[]>(
    (product?.variants ?? []).map((v) => ({ ...v, key: v.id ?? nextKey() }))
  );
  const [addonGroups, setAddonGroups] = useState<AddonGroupRow[]>(
    getAddonGroups(product?.attributes).map((g) => ({ ...g, key: nextKey() }))
  );

  const action = isEdit ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) toast.success('Product saved');
    if (state?.error) toast.error(state.error);
  }, [state]);

  const allImages = useMemo(
    () => (image ? [image, ...gallery.filter((g) => g !== image)] : gallery),
    [image, gallery]
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append('files', f);
    fd.set('folder', slug || 'misc');

    const result = await uploadProductImages(undefined, fd);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (result?.error) {
      toast.error(result.error);
      return;
    }
    const urls = result?.urls;
    if (urls) {
      setGallery((g) => [...g, ...urls]);
      if (!image) setImage(urls[0]);
      toast.success(`${urls.length} image(s) uploaded`);
    }
  }

  async function handleRemoveImage(url: string) {
    const fd = new FormData();
    fd.set('url', url);
    const result = await deleteProductImage(undefined, fd);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    if (image === url) {
      const rest = gallery.filter((g) => g !== url);
      setImage(rest[0] ?? null);
      setGallery(rest.slice(1));
    } else {
      setGallery((g) => g.filter((x) => x !== url));
    }
  }

  function setPrimaryImage(url: string) {
    if (url === image) return;
    setGallery((g) => [...(image ? [image] : []), ...g.filter((x) => x !== url)]);
    setImage(url);
  }

  function addBoxSize() {
    setBoxSizes((rows) => [
      ...rows,
      {
        key: nextKey(),
        id: null,
        box_size_kg: 5,
        selling_price: 0,
        stock_qty: 0,
        low_stock_threshold: 5,
        active: true,
      },
    ]);
  }

  function updateBoxSizeField<K extends keyof ProductBoxSizeInput>(
    key: string,
    field: K,
    value: ProductBoxSizeInput[K]
  ) {
    setBoxSizes((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function removeBoxSize(key: string) {
    setBoxSizes((rows) => rows.filter((r) => r.key !== key));
  }

  function addVariant() {
    setVariants((rows) => [
      ...rows,
      {
        key: nextKey(),
        id: null,
        attributes: {},
        label: '',
        selling_price: 0,
        stock_qty: 0,
        low_stock_threshold: 5,
        active: true,
      },
    ]);
  }

  function updateVariantField<K extends keyof ProductVariantInput>(
    key: string,
    field: K,
    value: ProductVariantInput[K]
  ) {
    setVariants((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function removeVariant(key: string) {
    setVariants((rows) => rows.filter((r) => r.key !== key));
  }

  function addAddonGroup() {
    setAddonGroups((rows) => [
      ...rows,
      { key: nextKey(), id: nextKey(), name: '', options: [], pricingTiers: [] },
    ]);
  }

  function removeAddonGroup(key: string) {
    setAddonGroups((rows) => rows.filter((r) => r.key !== key));
  }

  function updateAddonGroupName(key: string, name: string) {
    setAddonGroups((rows) =>
      rows.map((r) => (r.key === key ? { ...r, name, id: r.id.startsWith('new-') ? slugifyAddonId(name) || r.id : r.id } : r))
    );
  }

  function addAddonOption(key: string) {
    setAddonGroups((rows) =>
      rows.map((r) =>
        r.key === key ? { ...r, options: [...r.options, { id: nextKey(), label: '' }] } : r
      )
    );
  }

  function updateAddonOption(key: string, optionIndex: number, label: string) {
    setAddonGroups((rows) =>
      rows.map((r) =>
        r.key === key
          ? {
              ...r,
              options: r.options.map((o, i) =>
                i === optionIndex ? { ...o, id: o.id.startsWith('new-') ? slugifyAddonId(label) || o.id : o.id, label } : o
              ),
            }
          : r
      )
    );
  }

  function updateAddonOptionImage(key: string, optionIndex: number, image: string | undefined) {
    setAddonGroups((rows) =>
      rows.map((r) =>
        r.key === key
          ? { ...r, options: r.options.map((o, i) => (i === optionIndex ? { ...o, image } : o)) }
          : r
      )
    );
  }

  const [uploadingAddonImage, setUploadingAddonImage] = useState<string | null>(null);

  async function handleAddonOptionImageUpload(
    key: string,
    optionIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const uploadKey = `${key}:${optionIndex}`;
    setUploadingAddonImage(uploadKey);
    const fd = new FormData();
    fd.append('files', file);
    // uploadProductImages's folder param strips anything but a-z0-9- (see
    // actions.ts), so a "/" here would just get silently deleted rather
    // than nesting into a subfolder -- hyphenate instead.
    fd.set('folder', `${slug || 'misc'}-addons`);

    const result = await uploadProductImages(undefined, fd);
    setUploadingAddonImage(null);

    if (result?.error) {
      toast.error(result.error);
      return;
    }
    const url = result?.urls?.[0];
    if (url) updateAddonOptionImage(key, optionIndex, url);
  }

  function removeAddonOption(key: string, optionIndex: number) {
    setAddonGroups((rows) =>
      rows.map((r) => (r.key === key ? { ...r, options: r.options.filter((_, i) => i !== optionIndex) } : r))
    );
  }

  function addPricingTier(key: string) {
    setAddonGroups((rows) =>
      rows.map((r) =>
        r.key === key ? { ...r, pricingTiers: [...r.pricingTiers, { count: r.pricingTiers.length + 1, price: 0 }] } : r
      )
    );
  }

  function updatePricingTier(key: string, tierIndex: number, field: 'count' | 'price', value: number) {
    setAddonGroups((rows) =>
      rows.map((r) =>
        r.key === key
          ? { ...r, pricingTiers: r.pricingTiers.map((t, i) => (i === tierIndex ? { ...t, [field]: value } : t)) }
          : r
      )
    );
  }

  function removePricingTier(key: string, tierIndex: number) {
    setAddonGroups((rows) =>
      rows.map((r) =>
        r.key === key ? { ...r, pricingTiers: r.pricingTiers.filter((_, i) => i !== tierIndex) } : r
      )
    );
  }

  return (
    <form
      action={(fd) => {
        if (isEdit) fd.set('productId', product.id);
        fd.set('name', name);
        fd.set('slug', slug);
        fd.set('categoryId', categoryId);
        fd.set('unitCost', String(unitCost));
        fd.set('attributesJson', JSON.stringify(attrs));
        fd.set(
          'addonGroupsJson',
          JSON.stringify(
            addonGroups
              .filter((g) => g.name.trim() && g.options.some((o) => o.label.trim()))
              .map((g) => ({
                id: g.id,
                name: g.name,
                options: g.options.filter((o) => o.label.trim()),
                pricingTiers: g.pricingTiers,
                ...(g.note ? { note: g.note } : {}),
              }))
          )
        );
        fd.set('tagline', tagline);
        fd.set(
          'descriptionJson',
          JSON.stringify(
            descriptionText
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean)
          )
        );
        fd.set('discountPrice', discountPrice === '' ? '' : String(discountPrice));
        fd.set('weightNote', weightNote);
        fd.set('image', image ?? '');
        fd.set('galleryJson', JSON.stringify(gallery.filter((g) => g !== image)));
        fd.set('status', status);
        fd.set('sortOrder', String(sortOrder));
        fd.set('purchasePricePerKg', String(purchasePricePerKg));
        fd.set('packagingBoxCost', String(packagingBoxCost));
        fd.set('foamPaperCost', String(foamPaperCost));
        fd.set('brandingStickerCost', String(brandingStickerCost));
        fd.set('labourCost', String(labourCost));
        fd.set('marketingCostPerOrder', String(marketingCostPerOrder));
        fd.set('miscCost', String(miscCost));
        fd.set('isSeasonal', String(isSeasonal));
        fd.set('harvestSeasonStart', harvestStart);
        fd.set('harvestSeasonEnd', harvestEnd);
        fd.set('sellingPrice', model === 'simple' ? String(sellingPrice) : '');
        fd.set('stockQty', model === 'simple' ? String(stockQty) : '');
        fd.set('lowStockThreshold', String(lowStockThreshold));
        fd.set(
          'boxSizesJson',
          JSON.stringify(
            model === 'weight_based'
              ? boxSizes.map((b) => ({
                  id: b.id,
                  box_size_kg: b.box_size_kg,
                  selling_price: b.selling_price,
                  stock_qty: b.stock_qty,
                  low_stock_threshold: b.low_stock_threshold,
                  active: b.active,
                }))
              : []
          )
        );
        fd.set(
          'variantsJson',
          JSON.stringify(
            model === 'variant_based'
              ? variants.map((v) => ({
                  id: v.id,
                  attributes: v.attributes,
                  label: v.label,
                  selling_price: v.selling_price,
                  stock_qty: v.stock_qty,
                  low_stock_threshold: v.low_stock_threshold,
                  active: v.active,
                }))
              : []
          )
        );
        formAction(fd);
      }}
      className="space-y-6"
    >
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Basic Info</h2>
        <p className="mb-4 text-xs text-[var(--text-light)]">
          Category: <span className="font-medium text-[var(--text)]">{categorySchema.category}</span>{' '}
          — set by your platform admin. Fields below match this category.
        </p>
        {modelMismatch && (
          <p className="mb-4 rounded-lg bg-[var(--error)]/10 px-3 py-2 text-xs text-[var(--error)]">
            Your store’s category changed since this product was created.
            {canSubmit
              ? ' Saving will convert it to the new category’s fields.'
              : ' It already has stock/order history, so it can’t be converted automatically — remove its box sizes/variants first, or create a new product instead.'}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              required
            />
          </Field>
          <Field label="Slug">
            <input
              className={inputClass}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              required
            />
          </Field>
          <Field label="Category">
            <select
              className={inputClass}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Tagline">
            <input className={inputClass} value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </Field>
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              <input
                className={inputClass}
                value={attrs[f.key] ?? ''}
                onChange={(e) => setAttrs((a) => ({ ...a, [f.key]: e.target.value }))}
              />
            </Field>
          ))}
          <Field label="Weight note">
            <input
              className={inputClass}
              value={weightNote}
              onChange={(e) => setWeightNote(e.target.value)}
            />
          </Field>
          <Field label="Sort order">
            <input
              type="number"
              className={inputClass}
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
            />
          </Field>
          <Field label="Discount price (Rs, optional)">
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={discountPrice}
              onChange={(e) =>
                setDiscountPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
              }
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Description (one bullet per line)">
            <textarea
              className={inputClass}
              rows={4}
              value={descriptionText}
              onChange={(e) => setDescriptionText(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Images</h2>
        <div className="mb-4 flex flex-wrap gap-3">
          {allImages.map((url) => (
            <div
              key={url}
              className="group relative h-24 w-24 overflow-hidden rounded-lg border border-[var(--border-subtle)]"
            >
              <Image src={url} alt="" fill sizes="96px" className="object-cover" unoptimized />
              {url === image && (
                <span className="absolute left-1 top-1 rounded bg-[var(--mango-orange)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Primary
                </span>
              )}
              <div className="absolute inset-0 flex items-end justify-center gap-1 bg-black/0 p-1 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                {url !== image && (
                  <button
                    type="button"
                    onClick={() => setPrimaryImage(url)}
                    className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text)]"
                  >
                    Make primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(url)}
                  className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-[var(--error)]"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
          className="text-sm text-[var(--text)]"
        />
        {uploading && <p className="mt-2 text-xs text-[var(--text-light)]">Uploading…</p>}
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Cost Inputs</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {model === 'weight_based' ? (
            <Field label="Purchase price / kg">
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputClass}
                value={purchasePricePerKg}
                onChange={(e) => setPurchasePricePerKg(parseFloat(e.target.value) || 0)}
              />
            </Field>
          ) : (
            <Field label="Cost per unit">
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputClass}
                value={unitCost}
                onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
              />
            </Field>
          )}
          <Field label="Packaging box cost">
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={packagingBoxCost}
              onChange={(e) => setPackagingBoxCost(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Foam/paper cost">
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={foamPaperCost}
              onChange={(e) => setFoamPaperCost(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Branding/sticker cost">
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={brandingStickerCost}
              onChange={(e) => setBrandingStickerCost(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Labour cost">
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={labourCost}
              onChange={(e) => setLabourCost(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Marketing cost / order">
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={marketingCostPerOrder}
              onChange={(e) => setMarketingCostPerOrder(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Misc. cost">
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={miscCost}
              onChange={(e) => setMiscCost(parseFloat(e.target.value) || 0)}
            />
          </Field>
        </div>
      </div>

      {model === 'weight_based' && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Season</h2>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 pb-1.5 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={isSeasonal}
                onChange={(e) => setIsSeasonal(e.target.checked)}
                className="h-4 w-4 accent-[var(--mango-orange)]"
              />
              Seasonal product
            </label>
            {isSeasonal && (
              <>
                <Field label="Harvest start">
                  <input
                    type="date"
                    className={inputClass}
                    value={harvestStart}
                    onChange={(e) => setHarvestStart(e.target.value)}
                  />
                </Field>
                <Field label="Harvest end">
                  <input
                    type="date"
                    className={inputClass}
                    value={harvestEnd}
                    onChange={(e) => setHarvestEnd(e.target.value)}
                  />
                </Field>
              </>
            )}
          </div>
        </div>
      )}

      {model === 'weight_based' && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text)]">Box Sizes</h2>
            <button
              type="button"
              onClick={addBoxSize}
              className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
            >
              + Add Box Size
            </button>
          </div>
          {boxSizes.length === 0 ? (
            <p className="text-sm text-[var(--text-light)]">
              No box sizes yet — add at least one so this product can be sold.
            </p>
          ) : (
            <div className="space-y-3">
              {boxSizes.map((b) => (
                <div
                  key={b.key}
                  className="grid grid-cols-2 gap-3 border-b border-[var(--border-subtle)] pb-3 last:border-b-0 sm:grid-cols-6 sm:items-end"
                >
                  <Field label="Size (kg)">
                    <input
                      type="number"
                      min={0.1}
                      step="0.1"
                      className={inputClass}
                      value={b.box_size_kg}
                      onChange={(e) =>
                        updateBoxSizeField(b.key, 'box_size_kg', parseFloat(e.target.value) || 0)
                      }
                    />
                  </Field>
                  <Field label="Selling price">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={inputClass}
                      value={b.selling_price}
                      onChange={(e) =>
                        updateBoxSizeField(b.key, 'selling_price', parseFloat(e.target.value) || 0)
                      }
                    />
                  </Field>
                  <Field label="Stock qty">
                    <input
                      type="number"
                      min={0}
                      step="1"
                      className={inputClass}
                      value={b.stock_qty}
                      onChange={(e) =>
                        updateBoxSizeField(b.key, 'stock_qty', parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </Field>
                  <Field label="Low-stock threshold">
                    <input
                      type="number"
                      min={0}
                      step="1"
                      className={inputClass}
                      value={b.low_stock_threshold}
                      onChange={(e) =>
                        updateBoxSizeField(
                          b.key,
                          'low_stock_threshold',
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                    />
                  </Field>
                  <label className="flex items-center gap-2 pb-2 text-sm text-[var(--text)]">
                    <input
                      type="checkbox"
                      checked={b.active}
                      onChange={(e) => updateBoxSizeField(b.key, 'active', e.target.checked)}
                      className="h-4 w-4 accent-[var(--mango-orange)]"
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={() => removeBoxSize(b.key)}
                    className="h-fit rounded-lg border border-[var(--error)] px-3 py-1.5 text-xs font-semibold text-[var(--error)] transition hover:bg-[var(--error)]/10"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {model === 'variant_based' && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Variants</h2>
              {categorySchema.variant_example && (
                <p className="text-xs text-[var(--text-light)]">e.g. {categorySchema.variant_example}</p>
              )}
            </div>
            <button
              type="button"
              onClick={addVariant}
              className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
            >
              + Add Variant
            </button>
          </div>
          {variants.length === 0 ? (
            <p className="text-sm text-[var(--text-light)]">
              No variants yet — add at least one so this product can be sold.
            </p>
          ) : (
            <div className="space-y-3">
              {variants.map((v) => (
                <div
                  key={v.key}
                  className="grid grid-cols-2 gap-3 border-b border-[var(--border-subtle)] pb-3 last:border-b-0 sm:grid-cols-6 sm:items-end"
                >
                  <Field label="Variant (e.g. M / Blue)">
                    <input
                      className={inputClass}
                      value={v.label ?? ''}
                      onChange={(e) => updateVariantField(v.key, 'label', e.target.value)}
                    />
                  </Field>
                  <Field label="Selling price">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={inputClass}
                      value={v.selling_price}
                      onChange={(e) =>
                        updateVariantField(v.key, 'selling_price', parseFloat(e.target.value) || 0)
                      }
                    />
                  </Field>
                  <Field label="Stock qty">
                    <input
                      type="number"
                      min={0}
                      step="1"
                      className={inputClass}
                      value={v.stock_qty}
                      onChange={(e) =>
                        updateVariantField(v.key, 'stock_qty', parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </Field>
                  <Field label="Low-stock threshold">
                    <input
                      type="number"
                      min={0}
                      step="1"
                      className={inputClass}
                      value={v.low_stock_threshold}
                      onChange={(e) =>
                        updateVariantField(
                          v.key,
                          'low_stock_threshold',
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                    />
                  </Field>
                  <label className="flex items-center gap-2 pb-2 text-sm text-[var(--text)]">
                    <input
                      type="checkbox"
                      checked={v.active}
                      onChange={(e) => updateVariantField(v.key, 'active', e.target.checked)}
                      className="h-4 w-4 accent-[var(--mango-orange)]"
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={() => removeVariant(v.key)}
                    className="h-fit rounded-lg border border-[var(--error)] px-3 py-1.5 text-xs font-semibold text-[var(--error)] transition hover:bg-[var(--error)]/10"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {model === 'simple' && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Price &amp; Stock</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Selling price">
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputClass}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Stock qty">
              <input
                type="number"
                min={0}
                step="1"
                className={inputClass}
                value={stockQty}
                onChange={(e) => setStockQty(parseInt(e.target.value, 10) || 0)}
              />
            </Field>
            <Field label="Low-stock threshold">
              <input
                type="number"
                min={0}
                step="1"
                className={inputClass}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 0)}
              />
            </Field>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text)]">Add-ons</h2>
            <p className="text-xs text-[var(--text-light)]">
              Optional extras customers can pick on the product page (e.g. Gift Wrap, Ice Pack).
              Priced by how many they select, not per item.
            </p>
          </div>
          <button
            type="button"
            onClick={addAddonGroup}
            className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
          >
            + Add Group
          </button>
        </div>
        {addonGroups.length === 0 ? (
          <p className="text-sm text-[var(--text-light)]">No add-ons yet — this product sells as-is.</p>
        ) : (
          <div className="space-y-4">
            {addonGroups.map((g) => (
              <div key={g.key} className="rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <Field label="Group name (e.g. Extras)">
                    <input
                      className={inputClass}
                      value={g.name}
                      onChange={(e) => updateAddonGroupName(g.key, e.target.value)}
                      placeholder="Extras"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => removeAddonGroup(g.key)}
                    className="h-fit rounded-lg border border-[var(--error)] px-3 py-1.5 text-xs font-semibold text-[var(--error)] transition hover:bg-[var(--error)]/10"
                  >
                    Remove group
                  </button>
                </div>

                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-[var(--text-light)] uppercase tracking-wide">
                    Options
                  </label>
                  <div className="space-y-2">
                    {g.options.map((o, i) => {
                      const uploadKey = `${g.key}:${i}`;
                      const isUploading = uploadingAddonImage === uploadKey;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          {o.image ? (
                            <div className="group relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[var(--border-subtle)]">
                              <Image src={o.image} alt="" fill sizes="36px" unoptimized className="object-cover" />
                              <button
                                type="button"
                                onClick={() => updateAddonOptionImage(g.key, i, undefined)}
                                className="absolute inset-0 flex items-center justify-center bg-black/0 text-[9px] font-semibold text-white opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--border-subtle)] text-[9px] text-[var(--text-light)] hover:border-[var(--mango-orange)]">
                              {isUploading ? '…' : 'Photo'}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="sr-only"
                                disabled={isUploading}
                                onChange={(e) => handleAddonOptionImageUpload(g.key, i, e)}
                              />
                            </label>
                          )}
                          <input
                            className={inputClass}
                            value={o.label}
                            onChange={(e) => updateAddonOption(g.key, i, e.target.value)}
                            placeholder="Gift Wrap"
                          />
                          <button
                            type="button"
                            onClick={() => removeAddonOption(g.key, i)}
                            className="shrink-0 rounded-lg border border-[var(--error)] px-3 py-2 text-xs font-semibold text-[var(--error)] transition hover:bg-[var(--error)]/10"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => addAddonOption(g.key)}
                    className="mt-2 rounded-lg border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
                  >
                    + Add Option
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-light)] uppercase tracking-wide">
                    Pricing tiers (price for exactly N selected — leave empty for free add-ons)
                  </label>
                  <div className="space-y-2">
                    {g.pricingTiers.map((t, i) => (
                      <div key={i} className="flex items-end gap-2">
                        <Field label="Count">
                          <input
                            type="number"
                            min={1}
                            step="1"
                            className={inputClass}
                            value={t.count}
                            onChange={(e) => updatePricingTier(g.key, i, 'count', parseInt(e.target.value, 10) || 1)}
                          />
                        </Field>
                        <Field label="Price (Rs)">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={inputClass}
                            value={t.price}
                            onChange={(e) => updatePricingTier(g.key, i, 'price', parseFloat(e.target.value) || 0)}
                          />
                        </Field>
                        <button
                          type="button"
                          onClick={() => removePricingTier(g.key, i)}
                          className="h-fit rounded-lg border border-[var(--error)] px-3 py-2 text-xs font-semibold text-[var(--error)] transition hover:bg-[var(--error)]/10"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addPricingTier(g.key)}
                    className="mt-2 rounded-lg border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
                  >
                    + Add Tier
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={pending || uploading || !canSubmit}
        className="w-full rounded-lg bg-[var(--mango-orange)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {pending ? 'Saving…' : isEdit ? 'Save Product' : 'Create Product'}
      </button>
    </form>
  );
}
