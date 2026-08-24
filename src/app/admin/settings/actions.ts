'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/dal';

export type ActionState = { error?: string; success?: boolean } | undefined;

const urlField = z
  .string()
  .nullable()
  .refine((v) => v === null || /^https?:\/\/.+/i.test(v), {
    message: 'Enter a full URL starting with https://',
  });

const SettingsSchema = z.object({
  businessName: z.string().min(1, 'Business name is required.'),
  currency: z.string().min(1),
  paymentGatewayFeePercent: z.number().min(0).max(100),
  taxPercent: z.number().min(0).max(100),
  defaultShippingCost: z.number().min(0),
  lowStockAlertThreshold: z.number().int().min(0),
  supportPhone: z.string().nullable(),
  supportEmail: z.string().nullable(),
  supportWhatsapp: z.string().nullable(),
  whatsappOrderMessageTemplate: z.string().max(500).nullable(),
  businessAddress: z.string().nullable(),
  googleMapsUrl: urlField,
  facebookUrl: urlField,
  instagramUrl: urlField,
  tiktokUrl: urlField,
  youtubeUrl: urlField,
  twitterUrl: urlField,
  welcomeDiscountPercent: z.number().min(0).max(100),
  welcomeDiscountEnabled: z.boolean(),
});

export async function updateBusinessSettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const strOrNull = (v: FormDataEntryValue | null) =>
    v === null || String(v).trim() === '' ? null : String(v);

  const parsed = SettingsSchema.safeParse({
    businessName: formData.get('businessName'),
    currency: formData.get('currency'),
    paymentGatewayFeePercent: Number(formData.get('paymentGatewayFeePercent')),
    taxPercent: Number(formData.get('taxPercent')),
    defaultShippingCost: Number(formData.get('defaultShippingCost')),
    lowStockAlertThreshold: Number(formData.get('lowStockAlertThreshold')),
    supportPhone: strOrNull(formData.get('supportPhone')),
    supportEmail: strOrNull(formData.get('supportEmail')),
    supportWhatsapp: strOrNull(formData.get('supportWhatsapp')),
    whatsappOrderMessageTemplate: strOrNull(formData.get('whatsappOrderMessageTemplate')),
    businessAddress: strOrNull(formData.get('businessAddress')),
    googleMapsUrl: strOrNull(formData.get('googleMapsUrl')),
    facebookUrl: strOrNull(formData.get('facebookUrl')),
    instagramUrl: strOrNull(formData.get('instagramUrl')),
    tiktokUrl: strOrNull(formData.get('tiktokUrl')),
    youtubeUrl: strOrNull(formData.get('youtubeUrl')),
    twitterUrl: strOrNull(formData.get('twitterUrl')),
    welcomeDiscountPercent: Number(formData.get('welcomeDiscountPercent')),
    welcomeDiscountEnabled: formData.get('welcomeDiscountEnabled') === 'true',
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const supabase = await createClient();
  const d = parsed.data;
  const { error } = await supabase
    .from('business_settings')
    .update({
      business_name: d.businessName,
      currency: d.currency,
      payment_gateway_fee_percent: d.paymentGatewayFeePercent,
      tax_percent: d.taxPercent,
      default_shipping_cost: d.defaultShippingCost,
      low_stock_alert_threshold: d.lowStockAlertThreshold,
      support_phone: d.supportPhone,
      support_email: d.supportEmail,
      support_whatsapp: d.supportWhatsapp,
      whatsapp_order_message_template: d.whatsappOrderMessageTemplate,
      business_address: d.businessAddress,
      google_maps_url: d.googleMapsUrl,
      facebook_url: d.facebookUrl,
      instagram_url: d.instagramUrl,
      tiktok_url: d.tiktokUrl,
      youtube_url: d.youtubeUrl,
      twitter_url: d.twitterUrl,
      welcome_discount_percent: d.welcomeDiscountPercent,
      welcome_discount_enabled: d.welcomeDiscountEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq('vendor_id', admin.vendor_id);

  if (error) return { error: `Failed to save settings: ${error.message}` };

  revalidatePath('/admin/settings');
  return { success: true };
}
