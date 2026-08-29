import 'server-only';
import { createClient } from '@/lib/supabase/server';

export { ORDER_STATUSES, type OrderStatus } from '@/lib/order-status';

export type DeliveryInfo = {
  full_name: string;
  phone: string;
  address: string;
  city: string;
  postal_code?: string;
  notes?: string;
};

export type OrderItem = {
  product_id: string;
  name: string;
  variety?: string;
  // Present on fruit lines from the legacy (pre-product-type) checkout and
  // on new fruit lines alike. Non-fruit lines instead carry variant_label.
  box_size_kg?: number;
  variant_label?: string;
  qty: number;
  unit_price: number;
};

export type OrderListItem = {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  created_at: string;
};

export type OrderDetail = OrderListItem & {
  items: OrderItem[];
  delivery: DeliveryInfo;
  subtotal: number;
  shipping_fee: number;
  discount_code: string | null;
  discount_amount: number;
  profit: number | null;
  cost_snapshot: Record<string, unknown> | null;
  platform_fee_amount: number;
  tracking_number: string | null;
  courier_name: string | null;
  customer_email: string | null;
  payment_proof_url: string | null;
  payment_proof_uploaded_at: string | null;
  payment_verified_at: string | null;
  payment_rejection_reason: string | null;
};

export const ORDERS_PAGE_SIZE = 25;

export async function getOrdersList(
  statusFilter?: string,
  page = 1
): Promise<{ orders: OrderListItem[]; totalCount: number; page: number; pageSize: number }> {
  const supabase = await createClient();

  const from = (page - 1) * ORDERS_PAGE_SIZE;
  const to = from + ORDERS_PAGE_SIZE - 1;

  let query = supabase
    .from('orders')
    .select(
      'id, order_number, delivery, total, status, payment_status, payment_method, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to load orders: ${error.message}`);

  return {
    orders: (data ?? []).map((o) => ({
      id: o.id,
      order_number: o.order_number,
      customer_name: (o.delivery as DeliveryInfo | null)?.full_name ?? 'Unknown',
      total: o.total,
      status: o.status,
      payment_status: o.payment_status,
      payment_method: o.payment_method,
      created_at: o.created_at,
    })),
    totalCount: count ?? 0,
    page,
    pageSize: ORDERS_PAGE_SIZE,
  };
}

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select(
      `id, order_number, items, delivery, subtotal, shipping_fee, discount_code,
       discount_amount, total, status, payment_status, payment_method, tracking_number,
       courier_name, profit, cost_snapshot, platform_fee_amount, created_at, customer_id,
       payment_proof_url, payment_proof_uploaded_at, payment_verified_at,
       payment_rejection_reason`
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load order: ${error.message}`);
  if (!data) return null;

  let customerEmail: string | null = null;
  if (data.customer_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', data.customer_id)
      .maybeSingle();
    customerEmail = profile?.email ?? null;
  }

  const delivery = data.delivery as DeliveryInfo;

  return {
    id: data.id,
    order_number: data.order_number,
    customer_name: delivery?.full_name ?? 'Unknown',
    customer_email: customerEmail,
    items: (data.items as OrderItem[]) ?? [],
    delivery,
    subtotal: data.subtotal,
    shipping_fee: data.shipping_fee,
    discount_code: data.discount_code,
    discount_amount: data.discount_amount,
    total: data.total,
    status: data.status,
    payment_status: data.payment_status,
    payment_method: data.payment_method,
    tracking_number: data.tracking_number,
    courier_name: data.courier_name,
    profit: data.profit,
    cost_snapshot: data.cost_snapshot as Record<string, unknown> | null,
    platform_fee_amount: data.platform_fee_amount ?? 0,
    created_at: data.created_at,
    payment_proof_url: data.payment_proof_url,
    payment_proof_uploaded_at: data.payment_proof_uploaded_at,
    payment_verified_at: data.payment_verified_at,
    payment_rejection_reason: data.payment_rejection_reason,
  };
}
