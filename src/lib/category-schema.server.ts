import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { CategoryModel, CategorySchema } from '@/lib/product-types';

// Looks up the schema row for a vendor's assigned category. Returns null
// when the vendor has no category assigned yet (superadmin hasn't set one)
// -- callers must handle that by blocking product creation with a clear
// message rather than crashing or guessing a default, since silently
// defaulting to e.g. 'Other' would let a vendor create products before
// their real category (and therefore their real field set) is known.
export async function getCategorySchema(vendorCategory: string | null): Promise<CategorySchema | null> {
  if (!vendorCategory) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('category_product_schemas')
    .select('category, model, fields, variant_example, note')
    .eq('category', vendorCategory)
    .maybeSingle();
  if (error) throw new Error(`Failed to load category schema: ${error.message}`);
  if (!data) return null;
  return {
    category: data.category,
    model: data.model as CategoryModel,
    fields: (data.fields ?? []) as string[],
    variant_example: data.variant_example,
    note: data.note,
  };
}
