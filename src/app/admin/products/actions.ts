'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';
import { logAdminAction } from '@/lib/audit-log';
import {
  legacyColumnForField,
  normalizeProductModel,
  productLevelFields,
  productTypeValueForSchema,
  type CategorySchema,
} from '@/lib/product-types';
import { getCategorySchema } from '@/lib/category-schema.server';

export type ActionState = { error?: string; success?: boolean } | undefined;
export type UploadState = { error?: string; urls?: string[] } | undefined;

const BoxSizeSchema = z.object({
  id: z.uuid().nullable(),
  box_size_kg: z.number().positive(),
  selling_price: z.number().min(0),
  stock_qty: z.number().int().min(0),
  low_stock_threshold: z.number().int().min(0),
  active: z.boolean(),
});

const VariantSchema = z.object({
  id: z.uuid().nullable(),
  attributes: z.record(z.string(), z.string()),
  label: z.string().nullable(),
  selling_price: z.number().min(0),
  stock_qty: z.number().int().min(0),
  low_stock_threshold: z.number().int().min(0),
  active: z.boolean(),
});

const ProductSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  slug: z
    .string()
    .min(1, 'Slug is required.')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase, hyphen-separated.'),
  categoryId: z.uuid().nullable(),
  unitCost: z.number().min(0).nullable(),
  tagline: z.string().nullable(),
  description: z.array(z.string()),
  discountPrice: z.number().min(0).nullable(),
  weightNote: z.string().nullable(),
  image: z.string().nullable(),
  gallery: z.array(z.string()),
  status: z.enum(['draft', 'published', 'archived']),
  sortOrder: z.number().int(),
  purchasePricePerKg: z.number().min(0),
  packagingBoxCost: z.number().min(0),
  foamPaperCost: z.number().min(0),
  brandingStickerCost: z.number().min(0),
  labourCost: z.number().min(0),
  marketingCostPerOrder: z.number().min(0),
  miscCost: z.number().min(0),
  isSeasonal: z.boolean(),
  harvestSeasonStart: z.string().nullable(),
  harvestSeasonEnd: z.string().nullable(),
  sellingPrice: z.number().min(0).nullable(),
  stockQty: z.number().int().min(0).nullable(),
  lowStockThreshold: z.number().int().min(0),
  boxSizes: z.array(BoxSizeSchema),
  variants: z.array(VariantSchema),
  // Freeform key/value pairs for the vendor's category schema fields --
  // built entirely by this form's own dynamic-field UI (never hand-typed),
  // so a parse failure can safely fall back to {}.
  attributesJson: z.string(),
});

function parseProductForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const numOrNull = (v: FormDataEntryValue | undefined) =>
    v === undefined || v === '' ? null : Number(v);
  const strOrNull = (v: FormDataEntryValue | undefined) =>
    v === undefined || String(v).trim() === '' ? null : String(v);

  let boxSizes: unknown[] = [];
  let variants: unknown[] = [];
  let description: string[] = [];
  let gallery: string[] = [];
  try {
    boxSizes = JSON.parse(String(raw.boxSizesJson || '[]'));
    variants = JSON.parse(String(raw.variantsJson || '[]'));
    description = JSON.parse(String(raw.descriptionJson || '[]'));
    gallery = JSON.parse(String(raw.galleryJson || '[]'));
  } catch {
    // leave as empty arrays; zod validation below will still pass on []
  }

  return ProductSchema.safeParse({
    name: raw.name,
    slug: raw.slug,
    categoryId: strOrNull(raw.categoryId),
    unitCost: numOrNull(raw.unitCost),
    tagline: strOrNull(raw.tagline),
    description,
    discountPrice: numOrNull(raw.discountPrice),
    weightNote: strOrNull(raw.weightNote),
    image: strOrNull(raw.image),
    gallery,
    status: raw.status,
    sortOrder: Number(raw.sortOrder || 0),
    purchasePricePerKg: Number(raw.purchasePricePerKg || 0),
    packagingBoxCost: Number(raw.packagingBoxCost || 0),
    foamPaperCost: Number(raw.foamPaperCost || 0),
    brandingStickerCost: Number(raw.brandingStickerCost || 0),
    labourCost: Number(raw.labourCost || 0),
    marketingCostPerOrder: Number(raw.marketingCostPerOrder || 0),
    miscCost: Number(raw.miscCost || 0),
    isSeasonal: raw.isSeasonal === 'true',
    harvestSeasonStart: strOrNull(raw.harvestSeasonStart),
    harvestSeasonEnd: strOrNull(raw.harvestSeasonEnd),
    sellingPrice: numOrNull(raw.sellingPrice),
    stockQty: raw.stockQty === undefined || raw.stockQty === '' ? null : parseInt(String(raw.stockQty), 10),
    lowStockThreshold: parseInt(String(raw.lowStockThreshold || '5'), 10),
    boxSizes,
    variants,
    attributesJson: String(raw.attributesJson ?? '{}'),
  });
}

function parseAttributes(json: string): { attributes?: Record<string, unknown>; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { error: 'Attributes must be valid JSON.' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { error: 'Attributes must be a JSON object.' };
  }
  return { attributes: parsed as Record<string, unknown> };
}

// Splits the vendor-category schema's fields between the 4 legacy dedicated
// columns (origin/season/sweetness/fiber -- kept for Fruits backward
// compatibility) and everything else (written into attributes jsonb). See
// product-types.ts's legacyColumnForField for why these 4 are special.
function splitAttributesForColumns(
  schema: CategorySchema,
  attributes: Record<string, unknown>
): {
  attributes: Record<string, unknown>;
  origin: string | null;
  season: string | null;
  sweetness: string | null;
  fiber: string | null;
} {
  const legacy: Record<'origin' | 'season' | 'sweetness' | 'fiber', string | null> = {
    origin: null,
    season: null,
    sweetness: null,
    fiber: null,
  };
  const rest: Record<string, unknown> = {};
  for (const f of productLevelFields(schema)) {
    const column = legacyColumnForField(f.label);
    const value = attributes[f.key];
    if (column) {
      legacy[column] = typeof value === 'string' && value.trim() !== '' ? value : null;
    } else {
      rest[f.key] = value ?? '';
    }
  }
  return { attributes: rest, ...legacy };
}

export async function createProduct(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await getAdminUser();

  const schema = await getCategorySchema(admin.vendor_category);
  if (!schema) {
    return { error: 'Ask your platform admin to assign a product category to your store first.' };
  }

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { attributes: rawAttributes, error: attrError } = parseAttributes(parsed.data.attributesJson);
  if (attrError) return { error: attrError };

  const d = parsed.data;
  const model = schema.model;
  const { attributes, origin, season, sweetness, fiber } = splitAttributesForColumns(schema, rawAttributes ?? {});

  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      vendor_id: admin.vendor_id,
      category_id: d.categoryId,
      slug: d.slug,
      name: d.name,
      product_type: productTypeValueForSchema(schema),
      attributes,
      unit_cost: d.unitCost,
      origin,
      season,
      sweetness,
      fiber,
      tagline: d.tagline,
      description: d.description,
      discount_price: d.discountPrice,
      weight_note: d.weightNote,
      image: d.image,
      gallery: d.gallery,
      status: d.status,
      sort_order: d.sortOrder,
      purchase_price_per_kg: d.purchasePricePerKg,
      packaging_box_cost: d.packagingBoxCost,
      foam_paper_cost: d.foamPaperCost,
      branding_sticker_cost: d.brandingStickerCost,
      labour_cost: d.labourCost,
      marketing_cost_per_order: d.marketingCostPerOrder,
      misc_cost: d.miscCost,
      is_seasonal: d.isSeasonal,
      harvest_season_start: d.harvestSeasonStart,
      harvest_season_end: d.harvestSeasonEnd,
      selling_price: model === 'simple' ? d.sellingPrice : null,
      stock_qty: model === 'simple' ? d.stockQty : null,
      low_stock_threshold: d.lowStockThreshold,
      // For weight_based/variant_based products, price/unit are derived
      // automatically by the sync_product_price_unit trigger from the
      // cheapest active box size/variant (fired by the box_sizes/variants
      // insert below). 'simple' products have no box_sizes/variants rows to
      // fire that trigger at all, so their price has to be set directly
      // here from selling_price instead.
      ...(model === 'simple' ? { price: d.sellingPrice, unit: null } : {}),
    })
    .select('id')
    .single();

  if (error || !product) {
    return { error: `Failed to create product: ${error?.message ?? 'unknown error'}` };
  }

  if (model === 'weight_based' && d.boxSizes.length > 0) {
    const { error: boxError } = await supabase.from('product_box_sizes').insert(
      d.boxSizes.map((b) => ({
        product_id: product.id,
        box_size_kg: b.box_size_kg,
        selling_price: b.selling_price,
        stock_qty: b.stock_qty,
        low_stock_threshold: b.low_stock_threshold,
        active: b.active,
      }))
    );
    if (boxError) {
      return { error: `Product created but box sizes failed: ${boxError.message}` };
    }
  }

  if (model === 'variant_based' && d.variants.length > 0) {
    const { error: variantError } = await supabase.from('product_variants').insert(
      d.variants.map((v) => ({
        product_id: product.id,
        attributes: v.attributes,
        label: v.label,
        selling_price: v.selling_price,
        stock_qty: v.stock_qty,
        low_stock_threshold: v.low_stock_threshold,
        active: v.active,
      }))
    );
    if (variantError) {
      return { error: `Product created but variants failed: ${variantError.message}` };
    }
  }

  await logAdminAction(admin, 'create', 'product', product.id, { name: d.name, slug: d.slug });

  revalidatePath('/admin/products');
  redirect(`/admin/products/${product.id}`);
}

export async function updateProduct(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await getAdminUser();

  const productId = String(formData.get('productId') || '');
  if (!z.uuid().safeParse(productId).success) {
    return { error: 'Invalid product id.' };
  }

  const schema = await getCategorySchema(admin.vendor_category);
  if (!schema) {
    return { error: 'Ask your platform admin to assign a product category to your store first.' };
  }

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { attributes: rawAttributes, error: attrError } = parseAttributes(parsed.data.attributesJson);
  if (attrError) return { error: attrError };

  const supabase = await createClient();
  const d = parsed.data;
  const model = schema.model;
  const { attributes, origin, season, sweetness, fiber } = splitAttributesForColumns(schema, rawAttributes ?? {});

  // Retyping a product with real stock/order history is a correctness
  // hazard (the stock triggers key off which table -- box_sizes/variants/
  // the product row itself -- actually has rows, and switching model out
  // from under existing rows leaves them orphaned) -- block it rather than
  // let the UI silently start writing to the wrong table. This can now only
  // happen when the superadmin reassigns this vendor's category to one with
  // a different model after products already exist, since the model itself
  // is no longer admin-chosen per product.
  const { data: currentProduct } = await supabase
    .from('products')
    .select('product_type')
    .eq('id', productId)
    .maybeSingle();

  if (currentProduct && normalizeProductModel(currentProduct.product_type) !== model) {
    const [{ count: boxSizeCount }, { count: variantCount }, { data: hasHistory }] = await Promise.all([
      supabase
        .from('product_box_sizes')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId),
      supabase
        .from('product_variants')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId),
      supabase.rpc('product_has_order_history', { p_product_id: productId }),
    ]);
    if ((boxSizeCount ?? 0) > 0 || (variantCount ?? 0) > 0 || hasHistory) {
      return {
        error:
          'Your store’s category changed and this product can’t be converted automatically because it already has stock/order history. Remove its box sizes/variants first, or create a new product instead.',
      };
    }
  }

  const { error } = await supabase
    .from('products')
    .update({
      category_id: d.categoryId,
      slug: d.slug,
      name: d.name,
      product_type: productTypeValueForSchema(schema),
      attributes,
      unit_cost: d.unitCost,
      origin,
      season,
      sweetness,
      fiber,
      tagline: d.tagline,
      description: d.description,
      discount_price: d.discountPrice,
      weight_note: d.weightNote,
      image: d.image,
      gallery: d.gallery,
      status: d.status,
      sort_order: d.sortOrder,
      purchase_price_per_kg: d.purchasePricePerKg,
      packaging_box_cost: d.packagingBoxCost,
      foam_paper_cost: d.foamPaperCost,
      branding_sticker_cost: d.brandingStickerCost,
      labour_cost: d.labourCost,
      marketing_cost_per_order: d.marketingCostPerOrder,
      misc_cost: d.miscCost,
      is_seasonal: d.isSeasonal,
      harvest_season_start: d.harvestSeasonStart,
      harvest_season_end: d.harvestSeasonEnd,
      low_stock_threshold: d.lowStockThreshold,
      updated_at: new Date().toISOString(),
      // price/unit: see createProduct's comment. For 'simple' products
      // there are no box_sizes/variants rows to fire the sync trigger, so
      // selling_price/price/unit are set directly here too.
      ...(model === 'simple'
        ? { selling_price: d.sellingPrice, stock_qty: d.stockQty, price: d.sellingPrice, unit: null }
        : { selling_price: null, stock_qty: null }),
    })
    .eq('id', productId);

  if (error) return { error: `Failed to save product: ${error.message}` };

  // Reconcile box sizes: update existing (has id), insert new (no id),
  // delete any DB rows not present in the submitted list.
  const { data: existingRows } = await supabase
    .from('product_box_sizes')
    .select('id')
    .eq('product_id', productId);

  const submittedIds = new Set(d.boxSizes.filter((b) => b.id).map((b) => b.id as string));
  const toDelete = (existingRows ?? []).map((r) => r.id).filter((id) => !submittedIds.has(id));

  if (toDelete.length > 0) {
    const { error: delError } = await supabase
      .from('product_box_sizes')
      .delete()
      .in('id', toDelete);
    if (delError) return { error: `Failed to remove box sizes: ${delError.message}` };
  }

  for (const b of d.boxSizes) {
    if (b.id) {
      const { error: updError } = await supabase
        .from('product_box_sizes')
        .update({
          box_size_kg: b.box_size_kg,
          selling_price: b.selling_price,
          stock_qty: b.stock_qty,
          low_stock_threshold: b.low_stock_threshold,
          active: b.active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', b.id);
      if (updError) return { error: `Failed to save a box size: ${updError.message}` };
    } else {
      const { error: insError } = await supabase.from('product_box_sizes').insert({
        product_id: productId,
        box_size_kg: b.box_size_kg,
        selling_price: b.selling_price,
        stock_qty: b.stock_qty,
        low_stock_threshold: b.low_stock_threshold,
        active: b.active,
      });
      if (insError) return { error: `Failed to add a box size: ${insError.message}` };
    }
  }

  // Reconcile variants the same way: update existing (has id), insert new
  // (no id), delete any DB rows not present in the submitted list.
  const { data: existingVariantRows } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);

  const submittedVariantIds = new Set(d.variants.filter((v) => v.id).map((v) => v.id as string));
  const variantsToDelete = (existingVariantRows ?? [])
    .map((r) => r.id)
    .filter((id) => !submittedVariantIds.has(id));

  if (variantsToDelete.length > 0) {
    const { error: delVariantError } = await supabase
      .from('product_variants')
      .delete()
      .in('id', variantsToDelete);
    if (delVariantError) return { error: `Failed to remove variants: ${delVariantError.message}` };
  }

  for (const v of d.variants) {
    if (v.id) {
      const { error: updVariantError } = await supabase
        .from('product_variants')
        .update({
          attributes: v.attributes,
          label: v.label,
          selling_price: v.selling_price,
          stock_qty: v.stock_qty,
          low_stock_threshold: v.low_stock_threshold,
          active: v.active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', v.id);
      if (updVariantError) return { error: `Failed to save a variant: ${updVariantError.message}` };
    } else {
      const { error: insVariantError } = await supabase.from('product_variants').insert({
        product_id: productId,
        attributes: v.attributes,
        label: v.label,
        selling_price: v.selling_price,
        stock_qty: v.stock_qty,
        low_stock_threshold: v.low_stock_threshold,
        active: v.active,
      });
      if (insVariantError) return { error: `Failed to add a variant: ${insVariantError.message}` };
    }
  }

  await logAdminAction(admin, 'update', 'product', productId, { name: d.name, slug: d.slug });

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${productId}`);
  return { success: true };
}

const StatusChangeSchema = z.object({
  productId: z.uuid(),
  status: z.enum(['draft', 'published', 'archived']),
});

export async function setProductStatus(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await getAdminUser();

  const parsed = StatusChangeSchema.safeParse({
    productId: formData.get('productId'),
    status: formData.get('status'),
  });
  if (!parsed.success) return { error: 'Invalid input.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('products')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.productId);

  if (error) return { error: `Failed to update status: ${error.message}` };

  await logAdminAction(admin, 'set_status', 'product', parsed.data.productId, {
    status: parsed.data.status,
  });

  revalidatePath('/admin/products');
  return { success: true };
}

export async function uploadProductImages(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  await getAdminUser();

  const folder = String(formData.get('folder') || 'misc').replace(/[^a-z0-9-]/gi, '');
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) return { error: 'No files selected.' };

  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
  for (const file of files) {
    if (!ALLOWED.includes(file.type)) {
      return { error: `Unsupported file type: ${file.type || 'unknown'}` };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { error: `${file.name} is larger than 5MB.` };
    }
  }

  const supabase = await createClient();
  const urls: string[] = [];

  for (const file of files) {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return { error: `Upload failed for ${file.name}: ${uploadError.message}` };
    }

    const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(path);
    urls.push(publicUrl.publicUrl);
  }

  return { urls };
}

const DeleteImageSchema = z.object({ url: z.url() });

export async function deleteProductImage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await getAdminUser();

  const parsed = DeleteImageSchema.safeParse({ url: formData.get('url') });
  if (!parsed.success) return { error: 'Invalid image URL.' };

  const marker = '/product-images/';
  const idx = parsed.data.url.indexOf(marker);
  if (idx === -1) return { error: 'Not a product-images URL.' };
  const path = decodeURIComponent(parsed.data.url.slice(idx + marker.length));

  const supabase = await createClient();
  const { error } = await supabase.storage.from('product-images').remove([path]);

  if (error) return { error: `Failed to delete image: ${error.message}` };
  return { success: true };
}
