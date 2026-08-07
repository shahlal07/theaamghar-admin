import 'server-only';
import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_SITE_CONTENT,
  mergeSiteContent,
  type SiteContent,
} from '@/lib/site-content-defaults';

export type { SiteContent } from '@/lib/site-content-defaults';
export { DEFAULT_SITE_CONTENT, mergeSiteContent } from '@/lib/site-content-defaults';

export async function getSiteContent(): Promise<SiteContent> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('site_content')
    .select('content')
    .eq('id', true)
    .maybeSingle();

  return mergeSiteContent(DEFAULT_SITE_CONTENT, data?.content as Partial<SiteContent> | undefined);
}
