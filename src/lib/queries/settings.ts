import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type BusinessSettings = {
  payment_gateway_fee_percent: number;
  default_shipping_cost: number;
  currency: string;
  tax_percent: number;
  low_stock_alert_threshold: number;
  business_name: string;
  support_phone: string | null;
  support_email: string | null;
  support_whatsapp: string | null;
  business_address: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  welcome_discount_percent: number;
  welcome_discount_enabled: boolean;
};

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('business_settings')
    .select(
      'payment_gateway_fee_percent, default_shipping_cost, currency, tax_percent, low_stock_alert_threshold, business_name, support_phone, support_email, support_whatsapp, business_address, facebook_url, instagram_url, tiktok_url, youtube_url, twitter_url, welcome_discount_percent, welcome_discount_enabled'
    )
    .eq('id', true)
    .single();

  if (error) throw new Error(`Failed to load business settings: ${error.message}`);
  return data;
}
