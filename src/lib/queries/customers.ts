import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type CustomerListItem = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
};

export type CustomerOrderSummary = {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
};

export type CustomerDetail = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  orders: CustomerOrderSummary[];
  favourite_variety: string | null;
};

export async function getCustomersList(): Promise<CustomerListItem[]> {
  const supabase = await createClient();

  const [{ data: profiles, error: profilesError }, { data: orders, error: ordersError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, phone, created_at')
        .neq('role', 'admin')
        .order('created_at', { ascending: false }),
      // Unbounded by design (lifetime spend needs every order), but capped
      // as a circuit-breaker -- at real volume today this never comes close;
      // it just means a future data-volume surprise degrades gracefully
      // instead of an unbounded fetch failing outright.
      supabase.from('orders').select('customer_id, total, created_at').limit(10000),
    ]);

  if (profilesError) throw new Error(`Failed to load customers: ${profilesError.message}`);
  if (ordersError) throw new Error(`Failed to load orders: ${ordersError.message}`);

  const byCustomer = new Map<string, { count: number; total: number; last: string | null }>();
  for (const o of orders ?? []) {
    if (!o.customer_id) continue;
    const entry = byCustomer.get(o.customer_id) ?? { count: 0, total: 0, last: null };
    entry.count += 1;
    entry.total += o.total;
    if (!entry.last || o.created_at > entry.last) entry.last = o.created_at;
    byCustomer.set(o.customer_id, entry);
  }

  return (profiles ?? []).map((p) => {
    const stats = byCustomer.get(p.id);
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      created_at: p.created_at,
      order_count: stats?.count ?? 0,
      total_spent: stats?.total ?? 0,
      last_order_at: stats?.last ?? null,
    };
  });
}

export async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  const supabase = await createClient();

  const [{ data: profile, error: profileError }, { data: orders, error: ordersError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, phone, created_at')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('orders')
        .select('id, order_number, total, status, created_at, items')
        .eq('customer_id', id)
        .order('created_at', { ascending: false }),
    ]);

  if (profileError) throw new Error(`Failed to load customer: ${profileError.message}`);
  if (ordersError) throw new Error(`Failed to load customer orders: ${ordersError.message}`);
  if (!profile) return null;

  const varietyCounts = new Map<string, number>();
  for (const o of orders ?? []) {
    const items = (o.items as { name: string; qty: number }[] | null) ?? [];
    for (const item of items) {
      varietyCounts.set(item.name, (varietyCounts.get(item.name) ?? 0) + item.qty);
    }
  }
  let favouriteVariety: string | null = null;
  let maxQty = 0;
  for (const [name, qty] of varietyCounts) {
    if (qty > maxQty) {
      maxQty = qty;
      favouriteVariety = name;
    }
  }

  return {
    ...profile,
    orders: (orders ?? []).map((o) => ({
      id: o.id,
      order_number: o.order_number,
      total: o.total,
      status: o.status,
      created_at: o.created_at,
    })),
    favourite_variety: favouriteVariety,
  };
}
