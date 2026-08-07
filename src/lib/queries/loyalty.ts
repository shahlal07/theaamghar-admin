import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type GiftOrderSummary = {
  orderNumber: string;
  recipientName: string | null;
  message: string | null;
  total: number;
  status: string;
  createdAt: string;
};

export type GiftOrderStats = {
  totalCount: number;
  totalValue: number;
  recent: GiftOrderSummary[];
};

export async function getGiftOrderStats(): Promise<GiftOrderStats> {
  const supabase = await createClient();
  const { data, count } = await supabase
    .from('orders')
    .select('order_number, gift_recipient_name, gift_message, total, status, created_at', {
      count: 'exact',
    })
    .eq('is_gift', true)
    .order('created_at', { ascending: false })
    .limit(10);

  const rows = data ?? [];
  const { data: allGiftTotals } = await supabase.from('orders').select('total').eq('is_gift', true);
  const totalValue = (allGiftTotals ?? []).reduce((sum, o) => sum + Number(o.total), 0);

  return {
    totalCount: count ?? 0,
    totalValue,
    recent: rows.map((o) => ({
      orderNumber: o.order_number,
      recipientName: o.gift_recipient_name,
      message: o.gift_message,
      total: o.total,
      status: o.status,
      createdAt: o.created_at,
    })),
  };
}

export type TopReferrer = { name: string; conversions: number };

export type ReferralStats = {
  totalReferred: number;
  totalConversions: number;
  creditsAwarded: number;
  topReferrers: TopReferrer[];
};

export async function getReferralStats(): Promise<ReferralStats> {
  const supabase = await createClient();

  const { count: totalReferred } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .not('referred_by', 'is', null);

  const { data: referralEvents } = await supabase
    .from('mango_game_events')
    .select('profile_id, points, meta')
    .eq('event_type', 'referral');

  const referrerEvents = (referralEvents ?? []).filter(
    (e) => (e.meta as { role?: string } | null)?.role === 'referrer'
  );
  const creditsAwarded = (referralEvents ?? []).reduce((sum, e) => sum + e.points, 0);

  const conversionsByReferrer = new Map<string, number>();
  for (const e of referrerEvents) {
    conversionsByReferrer.set(e.profile_id, (conversionsByReferrer.get(e.profile_id) ?? 0) + 1);
  }

  let topReferrers: TopReferrer[] = [];
  if (conversionsByReferrer.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', [...conversionsByReferrer.keys()]);
    topReferrers = (profiles ?? [])
      .map((p) => ({
        name: p.name ?? p.email ?? 'Unknown',
        conversions: conversionsByReferrer.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5);
  }

  return {
    totalReferred: totalReferred ?? 0,
    totalConversions: referrerEvents.length,
    creditsAwarded,
    topReferrers,
  };
}

export type LeaderboardRow = {
  id: string;
  name: string | null;
  email: string | null;
  lifetimePoints: number;
  mangoCredits: number;
};

export async function getLeaderboardForAdmin(): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, name, email, mango_lifetime_points, mango_credits')
    .eq('role', 'customer')
    .gt('mango_lifetime_points', 0)
    .order('mango_lifetime_points', { ascending: false })
    .limit(15);

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    lifetimePoints: p.mango_lifetime_points,
    mangoCredits: p.mango_credits,
  }));
}

export type RedemptionSummary = {
  name: string;
  tier: string;
  couponCode: string;
  credits: number;
  createdAt: string;
};

export type RedemptionStats = {
  totalCount: number;
  totalCreditsRedeemed: number;
  recent: RedemptionSummary[];
};

export async function getRedemptionStats(): Promise<RedemptionStats> {
  const supabase = await createClient();

  const { data: events, count } = await supabase
    .from('mango_game_events')
    .select('profile_id, points, meta, created_at', { count: 'exact' })
    .eq('event_type', 'redeem')
    .order('created_at', { ascending: false })
    .limit(10);

  const rows = events ?? [];
  const totalCreditsRedeemed = rows.reduce((sum, e) => sum + Math.abs(e.points), 0);

  const profileIds = [...new Set(rows.map((e) => e.profile_id))];
  const namesById = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', profileIds);
    for (const p of profiles ?? []) namesById.set(p.id, p.name ?? p.email ?? 'Unknown');
  }

  return {
    totalCount: count ?? 0,
    totalCreditsRedeemed,
    recent: rows.map((e) => {
      const meta = e.meta as { tier?: string; coupon_code?: string } | null;
      return {
        name: namesById.get(e.profile_id) ?? 'Unknown',
        tier: meta?.tier ?? '—',
        couponCode: meta?.coupon_code ?? '—',
        credits: Math.abs(e.points),
        createdAt: e.created_at,
      };
    }),
  };
}
