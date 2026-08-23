import 'server-only';
import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_SITE_CONTENT,
  mergeSiteContent,
  type SiteContent,
} from '@/lib/site-content-defaults';

export type { SiteContent } from '@/lib/site-content-defaults';
export { DEFAULT_SITE_CONTENT, mergeSiteContent } from '@/lib/site-content-defaults';

// One site_content row per vendor_id, not a singleton -- `.eq('id', true)`
// was a leftover from before multi-tenancy (site_content has no `id` column
// on the live schema at all), silently matching zero rows and making the
// Website Content editor show every vendor the same generic defaults
// instead of their own actually-saved content.
export async function getSiteContent(vendorId: string): Promise<SiteContent> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('site_content')
    .select('content')
    .eq('vendor_id', vendorId)
    .maybeSingle();

  return mergeSiteContent(DEFAULT_SITE_CONTENT, data?.content as Partial<SiteContent> | undefined);
}
