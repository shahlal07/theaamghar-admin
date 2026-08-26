// Pure, client-safe logic (types, normalization, field derivation) lives in
// this file so ProductFormClient.tsx ('use client') can import it directly;
// the actual DB lookup (getCategorySchema) lives in
// './category-schema.server' instead, which is server-only.
//
// Replaces the old bounded fruit/clothing/other type system. A vendor's
// product-form shape is now driven entirely by `category_product_schemas`
// (a real, superadmin-curated table), keyed off the vendor's own
// `vendors.category` (assigned by the superadmin panel, not chosen here).
// Vendor admins never pick a category or a product type -- both are fixed
// for their store, so there is no type selector in the product form at all.

export type CategoryModel = 'weight_based' | 'variant_based' | 'simple';

export type CategorySchema = {
  category: string;
  model: CategoryModel;
  fields: string[];
  variant_example: string | null;
  note: string | null;
};

// `products.product_type` historically stored the old fruit/clothing/other
// literal (plus a couple of hand-inserted test values like 'beverage').
// Existing rows are left untouched by the migration -- this normalizes any
// stored value (old or new) down to one of the 3 canonical models so every
// read site (form, guards, inventory) can branch on model alone instead of
// re-deriving it in five places. New writes always store a canonical model
// value directly, so this is effectively a legacy-value shim.
export function normalizeProductModel(productType: string | null | undefined): CategoryModel {
  if (productType === 'weight_based' || productType === 'fruit') return 'weight_based';
  if (productType === 'simple') return 'simple';
  // 'variant_based', 'clothing', 'other', 'beverage', anything else unknown:
  // all of these historically stored their sellable units in
  // product_variants, so 'variant_based' is the correct normalization.
  return 'variant_based';
}

// Fields shown on the box-size UI (weight_based) are represented by real
// product_box_sizes rows, not a free-text attribute -- exclude anything in
// a weight_based category's field list that's clearly describing that same
// concept so it isn't rendered twice.
const BOX_SIZE_FIELD_PATTERN = /\bbox size\b|\bweight\s*\/|\bbundle size\b/i;

// Size/Color are the two fields every variant_based category schema uses to
// describe its actual variant dimensions (Clothing's "S / M / L / XL x 4
// colors", Beverages' "Small / Medium / Large") -- rendering them as a
// second, product-level free-text box in addition to the real per-variant
// Size/Color attribute editor on the Variants section would just be a
// confusing duplicate of the same concept. Everything else in a
// variant_based schema's field list (Fabric, Fit, Care instructions, Drink
// type, ...) stays a real product-level descriptive field.
const VARIANT_DIMENSION_FIELD_PATTERN = /^size$|^colou?r$/i;

// The schema only lists field *labels*, not machine keys (it's a shared,
// display-oriented table also read by the superadmin panel) -- derive a
// stable snake_case jsonb key from each label so the same field always
// round-trips to the same attributes key.
export function fieldKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Product-level free-text fields to render for a given category schema.
// Design choice (deliberately simple, see CLAUDE.md's "don't over-engineer
// a plugin system" instruction): `category_product_schemas.fields` doesn't
// distinguish which fields are per-product vs. per-variant, so for
// variant_based categories every field is treated as a product-level
// descriptive attribute (Fabric/Fit/Care for Clothing, Drink type/Caffeine
// for Beverages, etc.) and variants themselves are differentiated by a
// single free-text label (e.g. "M / Blue", "Small") instead of structured
// per-variant attribute columns. For weight_based categories, the one field
// that describes the box-size/weight dimension is excluded since that's
// already a dedicated UI section (product_box_sizes rows).
export function productLevelFields(schema: CategorySchema): { key: string; label: string }[] {
  return schema.fields
    .filter((label) => schema.model !== 'weight_based' || !BOX_SIZE_FIELD_PATTERN.test(label))
    .filter((label) => schema.model !== 'variant_based' || !VARIANT_DIMENSION_FIELD_PATTERN.test(label))
    .map((label) => ({ key: fieldKey(label), label }));
}

// The 4 dedicated fruit-era columns (origin/season/sweetness/fiber) stay as
// real columns rather than moving into attributes jsonb, purely for
// backward compatibility with existing Fruits-category data and any other
// code that reads them directly. Any OTHER category whose schema happens to
// define a field with one of these exact labels reuses the same column
// (e.g. if a future category adds "Season"); everything else goes into
// `attributes` jsonb.
const LEGACY_COLUMN_BY_LABEL: Record<string, 'origin' | 'season' | 'sweetness' | 'fiber'> = {
  origin: 'origin',
  season: 'season',
  sweetness: 'sweetness',
  fiber: 'fiber',
};

export function legacyColumnForField(label: string): 'origin' | 'season' | 'sweetness' | 'fiber' | null {
  return LEGACY_COLUMN_BY_LABEL[label.toLowerCase()] ?? null;
}

// The literal string to persist into products.product_type for a given
// category schema. This is 'fruit' -- not the generic 'weight_based' model
// string -- specifically for the 'Fruits' category, because
// src/lib/queries/varieties.ts (the Varieties & Seasons page) filters on
// the literal `product_type = 'fruit'` to distinguish real fruit products
// from anything else. Writing 'weight_based' there would silently drop
// every Fruits-category product out of that page the next time it's saved
// through this form. Every other category writes its canonical model
// string directly.
export function productTypeValueForSchema(schema: CategorySchema): string {
  return schema.category === 'Fruits' ? 'fruit' : schema.model;
}
