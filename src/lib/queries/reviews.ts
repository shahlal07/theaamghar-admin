import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/dal';

export type Review = {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  body: string;
  verified_purchase: boolean;
  created_at: string;
  images: string[];
  admin_reply_body: string | null;
  admin_reply_images: string[];
  admin_reply_at: string | null;
  product_name: string;
  product_slug: string;
  customer_name: string;
};

// Deliberately three flat queries + a JS join instead of a nested
// `.select("...,product:products(...),profile:profiles(...)")` embed —
// this app avoids PostgREST embeds entirely (see orders.ts) since a new
// table anywhere in this shared schema can silently make an existing embed
// ambiguous with no error surfaced. Reviews/products/profiles counts are
// all small enough that this costs nothing in practice.
export async function getReviews(): Promise<Review[]> {
  const admin = await getAdminUser();
  const supabase = await createClient();

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select(
      'id, product_id, profile_id, rating, title, body, verified_purchase, created_at, images, admin_reply_body, admin_reply_images, admin_reply_at'
    )
    .eq('vendor_id', admin.vendor_id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);
  if (!reviews || reviews.length === 0) return [];

  const productIds = [...new Set(reviews.map((r) => r.product_id))];
  const profileIds = [...new Set(reviews.map((r) => r.profile_id))];

  const [{ data: products }, { data: profiles }] = await Promise.all([
    supabase.from('products').select('id, name, slug').in('id', productIds),
    supabase.from('profiles').select('id, name').in('id', profileIds),
  ]);

  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return reviews.map((r) => ({
    id: r.id,
    product_id: r.product_id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    verified_purchase: r.verified_purchase,
    created_at: r.created_at,
    images: r.images,
    admin_reply_body: r.admin_reply_body,
    admin_reply_images: r.admin_reply_images,
    admin_reply_at: r.admin_reply_at,
    product_name: productById.get(r.product_id)?.name ?? 'Unknown product',
    product_slug: productById.get(r.product_id)?.slug ?? '',
    customer_name: profileById.get(r.profile_id)?.name ?? 'Anonymous',
  }));
}
