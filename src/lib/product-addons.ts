// Mirrors vendor-storefronts' src/lib/product-addons.ts AddonGroup shape --
// both apps read/write the same products.attributes.addon_groups jsonb key,
// so the type must stay identical between them. Kept here (not imported
// cross-repo, these are separate Next.js apps) purely for the admin form's
// own type-checking.

export type AddonOption = { id: string; label: string; image?: string };
export type AddonPricingTier = { count: number; price: number };
export type AddonGroup = {
  id: string;
  name: string;
  options: AddonOption[];
  pricingTiers: AddonPricingTier[];
  note?: string;
};

export function getAddonGroups(attributes: Record<string, unknown> | null | undefined): AddonGroup[] {
  const groups = (attributes as { addon_groups?: unknown } | null)?.addon_groups;
  if (!Array.isArray(groups)) return [];
  return groups as AddonGroup[];
}

export function slugifyAddonId(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
