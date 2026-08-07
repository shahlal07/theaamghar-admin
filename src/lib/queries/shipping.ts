import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type ShippingZone = {
  id: string;
  province: string;
  city: string | null;
  rate: number;
  active: boolean;
};

export type ProvinceShipping = {
  province: string;
  defaultZone: ShippingZone | null;
  cityOverrides: ShippingZone[];
};

export async function getShippingZones(): Promise<ProvinceShipping[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('shipping_zones')
    .select('id, province, city, rate, active')
    .order('province')
    .order('city', { nullsFirst: true });

  if (error) throw new Error(`Failed to load shipping zones: ${error.message}`);

  const byProvince = new Map<string, ProvinceShipping>();
  for (const zone of data ?? []) {
    if (!byProvince.has(zone.province)) {
      byProvince.set(zone.province, { province: zone.province, defaultZone: null, cityOverrides: [] });
    }
    const entry = byProvince.get(zone.province)!;
    if (zone.city === null) {
      entry.defaultZone = zone;
    } else {
      entry.cityOverrides.push(zone);
    }
  }

  return [...byProvince.values()];
}
