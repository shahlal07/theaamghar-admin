// Bounded, code-defined set of product types (fruit/clothing/other) rather
// than a DB-driven dynamic field-definition system -- this is a
// single-vendor business adding at most a handful of real categories, not a
// multi-tenant marketplace needing runtime-defined schemas. Adding a real
// new type later is a small additive PR here (new entries below + widening
// the products.product_type CHECK), not a rebuild.
export type ProductType = "fruit" | "clothing" | "other";

export const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: "fruit", label: "Fruit" },
  { value: "clothing", label: "Clothing" },
  { value: "other", label: "Other" },
];

// Product-level extra fields (written into products.attributes jsonb) shown
// as fixed inputs for a type. 'other' has no fixed shape -- the form falls
// back to a raw-JSON textarea for it instead (see ProductFormClient.tsx).
export const PRODUCT_TYPE_ATTRIBUTE_FIELDS: Record<"clothing", { key: string; label: string }[]> = {
  clothing: [
    { key: "fabric", label: "Fabric" },
    { key: "fit", label: "Fit" },
    { key: "care_instructions", label: "Care Instructions" },
    { key: "made_in", label: "Made In" },
  ],
};

// Variant-level dimensions (product_variants.attributes jsonb) for non-fruit
// types -- fruit keeps using product_box_sizes' box_size_kg column, unchanged.
export const PRODUCT_TYPE_VARIANT_DIMENSIONS: Record<"clothing" | "other", { key: string; label: string }[]> = {
  clothing: [
    { key: "size", label: "Size" },
    { key: "color", label: "Color" },
  ],
  other: [{ key: "label", label: "Variant label" }],
};
