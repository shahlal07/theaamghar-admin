'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/dal';
import { logAdminAction } from '@/lib/audit-log';
import { DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/site-content-defaults';

export type ContentActionState = { error?: string; success?: boolean } | undefined;

const SECTION_KEYS = Object.keys(DEFAULT_SITE_CONTENT) as (keyof SiteContent)[];

async function readRawContent(vendorId: string): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const { data } = await supabase.from('site_content').select('content').eq('vendor_id', vendorId).maybeSingle();
  return (data?.content as Record<string, unknown> | null) ?? {};
}

// Shallow top-level merge only -- each Server Action here writes exactly one
// section key at a time (the editor submits one section per form), so a
// deep merge like mergeSiteContent's isn't needed for the write path; it's
// only needed on read, over the defaults, in getSiteContent().
//
// One row per vendor_id (not a singleton -- an earlier version of this file
// predated multi-tenancy and queried `.eq('id', true)` against a column that
// doesn't exist on the live schema, silently no-op-ing every save for every
// vendor except whichever one a raw SQL update happened to target directly).
// Uses update(), not upsert() -- each vendor's row is seeded once by
// provisioning and never deleted, and RLS only grants UPDATE on this table
// (no INSERT policy for regular admins, deliberately, since a vendor admin
// should never be able to create another vendor's row). upsert() compiles to
// INSERT ... ON CONFLICT DO UPDATE, which Postgres's RLS still evaluates
// against the INSERT policy even when the row already exists -- with no
// INSERT policy granted to admins, that silently 0-rows/rejects.
async function writeContentPatch(vendorId: string, patch: Record<string, unknown>): Promise<{ error?: string }> {
  const supabase = await createClient();
  const current = await readRawContent(vendorId);
  const next = { ...current, ...patch };
  const { error } = await supabase
    .from('site_content')
    .update({ content: next, updated_at: new Date().toISOString() })
    .eq('vendor_id', vendorId);
  return error ? { error: error.message } : {};
}

export async function updateSiteContentSection(
  _prev: ContentActionState,
  formData: FormData
): Promise<ContentActionState> {
  const admin = await requireAdmin();

  const section = String(formData.get('section') ?? '') as keyof SiteContent;
  const json = String(formData.get('json') ?? '');

  if (!SECTION_KEYS.includes(section)) return { error: 'Unknown content section.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { error: 'Invalid JSON -- check for a missing quote, comma, or bracket.' };
  }

  // faqFallback is the one section whose value is an array; every other
  // section is an object -- validate against whichever shape the defaults
  // actually have rather than assuming "object" universally.
  const expectsArray = Array.isArray(DEFAULT_SITE_CONTENT[section]);
  if (expectsArray && !Array.isArray(parsed)) {
    return { error: 'This section expects a JSON array (e.g. [ {...}, {...} ]).' };
  }
  if (!expectsArray && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
    return { error: 'This section expects a JSON object (e.g. { ... }).' };
  }

  // brandColors gets interpolated directly into a <style> tag on the
  // storefront (see vendor-storefronts's layout.tsx) -- reject anything that
  // isn't a plain 6-digit hex here rather than relying solely on that
  // render-time fallback, so a bad value never even reaches the DB.
  if (section === 'brandColors') {
    const HEX = /^#[0-9a-f]{6}$/i;
    const invalid = Object.entries(parsed as Record<string, unknown>).find(
      ([, v]) => typeof v !== 'string' || !HEX.test(v)
    );
    if (invalid) {
      return { error: `"${invalid[0]}" must be a 6-digit hex color like #ff6b00.` };
    }
  }

  const { error } = await writeContentPatch(admin.vendor_id, { [section]: parsed });
  if (error) return { error: `Failed to save: ${error}` };

  await logAdminAction(admin, 'update', 'site_content', section);
  revalidatePath('/admin/settings/content');
  return { success: true };
}

type ImageField =
  | 'brandLogo'
  | 'brandFavicon'
  | 'heroDesktop'
  | 'heroMobile'
  | 'storyBannerDesktop'
  | 'storyBannerMobile';

const IMAGE_FIELD_CONFIG: Record<
  ImageField,
  { section: keyof SiteContent; key: string; basePath: string }
> = {
  brandLogo: { section: 'brand', key: 'logoImageUrl', basePath: 'brand-logo' },
  brandFavicon: { section: 'brand', key: 'faviconUrl', basePath: 'brand-favicon' },
  heroDesktop: { section: 'hero', key: 'desktopImageUrl', basePath: 'hero-desktop' },
  heroMobile: { section: 'hero', key: 'mobileImageUrl', basePath: 'hero-mobile' },
  storyBannerDesktop: { section: 'storyBanner', key: 'desktopImageUrl', basePath: 'story-banner-desktop' },
  storyBannerMobile: { section: 'storyBanner', key: 'mobileImageUrl', basePath: 'story-banner-mobile' },
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadSiteContentImage(
  _prev: ContentActionState,
  formData: FormData
): Promise<ContentActionState> {
  const admin = await requireAdmin();

  const field = String(formData.get('field') ?? '') as ImageField;
  const config = IMAGE_FIELD_CONFIG[field];
  if (!config) return { error: 'Unknown image field.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'No file selected.' };
  if (!ALLOWED_TYPES.includes(file.type)) return { error: `Unsupported file type: ${file.type || 'unknown'}` };
  if (file.size > MAX_BYTES) return { error: 'File is larger than 5MB.' };

  const supabase = await createClient();
  const current = await readRawContent(admin.vendor_id);
  const sectionData = (current[config.section] as Record<string, unknown> | undefined) ?? {};
  const previousUrl = sectionData[config.key] as string | null | undefined;

  // Storage RLS requires the first path segment to be the uploader's own
  // vendor_id (admins manage site content images policy) -- the unscoped
  // path this used to write (e.g. plain "hero-mobile.jpg") both failed that
  // check for every non-super-admin and, for the one caller (super admin)
  // it didn't reject, would have every vendor's hero image overwrite every
  // other vendor's at the same shared path.
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${admin.vendor_id}/${config.basePath}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('site-content-images')
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  // Fixed path + upsert only overwrites in place when the extension matches
  // the previous upload -- if an admin swaps e.g. a .png logo for a .webp
  // one, clean up the old file explicitly so it doesn't linger as an orphan.
  if (previousUrl) {
    const marker = '/site-content-images/';
    const idx = previousUrl.indexOf(marker);
    if (idx !== -1) {
      const previousPath = decodeURIComponent(previousUrl.slice(idx + marker.length).split('?')[0]);
      if (previousPath !== path) {
        await supabase.storage.from('site-content-images').remove([previousPath]);
      }
    }
  }

  const { data: publicUrl } = supabase.storage.from('site-content-images').getPublicUrl(path);
  // The fixed path means the URL is identical after a replace-in-place
  // upload, so a cache-busting query param is the only way browsers/CDNs
  // pick up the new file instead of serving a stale cached copy.
  const bustedUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;

  const { error } = await writeContentPatch(admin.vendor_id, {
    [config.section]: { ...sectionData, [config.key]: bustedUrl },
  });
  if (error) return { error: `Failed to save: ${error}` };

  await logAdminAction(admin, 'update', 'site_content', field);
  revalidatePath('/admin/settings/content');
  return { success: true };
}

type VideoField = 'heroDesktopVideo' | 'heroMobileVideo' | 'storyBannerDesktopVideo' | 'storyBannerMobileVideo';

const VIDEO_FIELD_CONFIG: Record<
  VideoField,
  { section: keyof SiteContent; key: string; basePath: string }
> = {
  heroDesktopVideo: { section: 'hero', key: 'desktopVideoUrl', basePath: 'hero-desktop-video' },
  heroMobileVideo: { section: 'hero', key: 'mobileVideoUrl', basePath: 'hero-mobile-video' },
  storyBannerDesktopVideo: { section: 'storyBanner', key: 'videoUrl', basePath: 'story-banner-desktop-video' },
  storyBannerMobileVideo: { section: 'storyBanner', key: 'mobileVideoUrl', basePath: 'story-banner-mobile-video' },
};

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

// Mirrors uploadSiteContentImage above, against the separate
// site-content-videos bucket (the images one rejects non-image mime types
// at the bucket level).
export async function uploadSiteContentVideo(
  _prev: ContentActionState,
  formData: FormData
): Promise<ContentActionState> {
  const admin = await requireAdmin();

  const field = String(formData.get('field') ?? '') as VideoField;
  const config = VIDEO_FIELD_CONFIG[field];
  if (!config) return { error: 'Unknown video field.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'No file selected.' };
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) return { error: `Unsupported file type: ${file.type || 'unknown'}` };
  if (file.size > MAX_VIDEO_BYTES) return { error: 'Video is larger than 30MB.' };

  const supabase = await createClient();
  const current = await readRawContent(admin.vendor_id);
  const sectionData = (current[config.section] as Record<string, unknown> | undefined) ?? {};
  const previousUrl = sectionData[config.key] as string | null | undefined;

  const ext = file.type === 'video/webm' ? 'webm' : 'mp4';
  const path = `${admin.vendor_id}/${config.basePath}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('site-content-videos')
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  if (previousUrl) {
    const marker = '/site-content-videos/';
    const idx = previousUrl.indexOf(marker);
    if (idx !== -1) {
      const previousPath = decodeURIComponent(previousUrl.slice(idx + marker.length).split('?')[0]);
      if (previousPath !== path) {
        await supabase.storage.from('site-content-videos').remove([previousPath]);
      }
    }
  }

  const { data: publicUrl } = supabase.storage.from('site-content-videos').getPublicUrl(path);
  const bustedUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;

  const { error } = await writeContentPatch(admin.vendor_id, {
    [config.section]: { ...sectionData, [config.key]: bustedUrl },
  });
  if (error) return { error: `Failed to save: ${error}` };

  await logAdminAction(admin, 'update', 'site_content', field);
  revalidatePath('/admin/settings/content');
  return { success: true };
}

// Clears a video field back to empty (the size-conscious equivalent of the
// image uploaders always having a file to replace-in-place -- a video field
// needs an explicit "remove" since customers pay for mobile data downloading
// it).
export async function clearSiteContentVideo(field: VideoField): Promise<ContentActionState> {
  const admin = await requireAdmin();
  const config = VIDEO_FIELD_CONFIG[field];
  if (!config) return { error: 'Unknown video field.' };

  const current = await readRawContent(admin.vendor_id);
  const sectionData = (current[config.section] as Record<string, unknown> | undefined) ?? {};
  const previousUrl = sectionData[config.key] as string | null | undefined;

  if (previousUrl) {
    const supabase = await createClient();
    const marker = '/site-content-videos/';
    const idx = previousUrl.indexOf(marker);
    if (idx !== -1) {
      const previousPath = decodeURIComponent(previousUrl.slice(idx + marker.length).split('?')[0]);
      await supabase.storage.from('site-content-videos').remove([previousPath]);
    }
  }

  const { error } = await writeContentPatch(admin.vendor_id, {
    [config.section]: { ...sectionData, [config.key]: '' },
  });
  if (error) return { error: `Failed to save: ${error}` };

  revalidatePath('/admin/settings/content');
  return { success: true };
}
