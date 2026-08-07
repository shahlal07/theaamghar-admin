'use client';

import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import type { SiteContent } from '@/lib/site-content-defaults';
import { updateSiteContentSection, uploadSiteContentImage } from './actions';

const inputClass =
  'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)] focus:ring-2 focus:ring-[var(--mango-orange)]/20';
const textareaClass = `${inputClass} min-h-[80px] resize-y`;
const monoClass = `${inputClass} min-h-[140px] resize-y font-mono text-xs`;

function Field({ label, hint, span2, children }: { label: string; hint?: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <div className={span2 ? 'sm:col-span-2' : undefined}>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-[var(--text-light)]">{hint}</p>}
    </div>
  );
}

// --- generic section editor -------------------------------------------
//
// Every section except faqFallback is a flat-ish object; the pragmatic
// schema below drives each field's input widget: scalars get a text/
// textarea, a string[] (trustBar.items) gets a newline-delimited textarea,
// and the handful of object-array fields (story.stats, whyChooseUs.reasons)
// get a raw JSON textarea with try/catch validation on save rather than a
// bespoke repeater UI -- not worth building for fields this rare.

type FieldConfig = { key: string; label: string; type: 'text' | 'textarea' | 'newline-array' | 'json' | 'color' };

type SectionConfig =
  | { section: keyof SiteContent; title: string; description?: string; kind: 'fields'; fields: FieldConfig[] }
  | { section: keyof SiteContent; title: string; description?: string; kind: 'json-array' };

function sectionToEditState(config: SectionConfig, data: unknown): Record<string, string> {
  if (config.kind === 'json-array') {
    return { __json: JSON.stringify(data ?? [], null, 2) };
  }
  const obj = (data ?? {}) as Record<string, unknown>;
  const state: Record<string, string> = {};
  for (const f of config.fields) {
    const v = obj[f.key];
    if (f.type === 'newline-array') {
      state[f.key] = Array.isArray(v) ? v.join('\n') : '';
    } else if (f.type === 'json') {
      state[f.key] = JSON.stringify(v ?? [], null, 2);
    } else {
      state[f.key] = typeof v === 'string' ? v : '';
    }
  }
  return state;
}

function SectionCard({ config, data }: { config: SectionConfig; data: unknown }) {
  const [state, formAction, pending] = useActionState(updateSiteContentSection, undefined);
  const [edit, setEdit] = useState(() => sectionToEditState(config, data));
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (state?.success) toast.success(`${config.title} saved`);
    if (state?.error) toast.error(state.error);
  }, [state, config.title]);

  function buildPayload(): unknown {
    setJsonError(null);
    if (config.kind === 'json-array') {
      try {
        const parsed = JSON.parse(edit.__json);
        if (!Array.isArray(parsed)) throw new Error('Must be a JSON array.');
        return parsed;
      } catch (e) {
        setJsonError(e instanceof Error ? e.message : 'Invalid JSON.');
        return undefined;
      }
    }
    const base = { ...(data as Record<string, unknown>) };
    for (const f of config.fields) {
      const raw = edit[f.key] ?? '';
      if (f.type === 'newline-array') {
        base[f.key] = raw.split('\n').map((s) => s.trim()).filter(Boolean);
      } else if (f.type === 'json') {
        try {
          base[f.key] = JSON.parse(raw);
        } catch (e) {
          setJsonError(`${f.label}: ${e instanceof Error ? e.message : 'Invalid JSON.'}`);
          return undefined;
        }
      } else {
        base[f.key] = raw;
      }
    }
    return base;
  }

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
      <h3 className="mb-1 text-base font-bold text-[var(--text)]">{config.title}</h3>
      {config.description && <p className="mb-4 text-xs text-[var(--text-light)]">{config.description}</p>}
      <form
        action={(fd) => {
          const payload = buildPayload();
          if (payload === undefined) return;
          fd.set('section', config.section);
          fd.set('json', JSON.stringify(payload));
          formAction(fd);
        }}
        className="space-y-4"
      >
        {config.kind === 'json-array' ? (
          <Field label="Raw JSON" hint="Array of objects -- must stay valid JSON.">
            <textarea
              value={edit.__json}
              onChange={(e) => setEdit({ __json: e.target.value })}
              className={monoClass}
              spellCheck={false}
            />
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {config.fields.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                span2={f.type === 'textarea' || f.type === 'json'}
                hint={
                  f.type === 'newline-array'
                    ? 'One per line.'
                    : f.type === 'json'
                      ? 'Raw JSON array of objects.'
                      : undefined
                }
              >
                {f.type === 'color' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(edit[f.key] ?? '') ? edit[f.key] : '#000000'}
                      onChange={(e) => setEdit((s) => ({ ...s, [f.key]: e.target.value }))}
                      className="h-9 w-12 shrink-0 cursor-pointer rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-1"
                    />
                    <input
                      value={edit[f.key] ?? ''}
                      onChange={(e) => setEdit((s) => ({ ...s, [f.key]: e.target.value }))}
                      placeholder="#ff6b00"
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                ) : f.type === 'text' ? (
                  <input
                    value={edit[f.key] ?? ''}
                    onChange={(e) => setEdit((s) => ({ ...s, [f.key]: e.target.value }))}
                    className={inputClass}
                  />
                ) : f.type === 'json' ? (
                  <textarea
                    value={edit[f.key] ?? ''}
                    onChange={(e) => setEdit((s) => ({ ...s, [f.key]: e.target.value }))}
                    className={monoClass}
                    spellCheck={false}
                  />
                ) : (
                  <textarea
                    value={edit[f.key] ?? ''}
                    onChange={(e) => setEdit((s) => ({ ...s, [f.key]: e.target.value }))}
                    className={textareaClass}
                  />
                )}
              </Field>
            ))}
          </div>
        )}
        {jsonError && <p className="text-xs font-medium text-red-600">{jsonError}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--mango-orange)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}

// --- image fields --------------------------------------------------------
// Only these 4 fields get real upload UI (per plan); every other URL-shaped
// field (video URLs) stays a plain text input above, since the storage
// bucket only accepts jpeg/png/webp anyway.

type ImageField = 'brandLogo' | 'brandFavicon' | 'heroMobile' | 'storyBannerMobile';

function ImageFieldUploader({
  field,
  label,
  currentUrl,
}: {
  field: ImageField;
  label: string;
  currentUrl: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.set('field', field);
    fd.set('file', file);
    const result = await uploadSiteContentImage(undefined, fd);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';

    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`${label} updated`);
    setPreviewUrl(URL.createObjectURL(file));
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
        {label}
      </label>
      <div className="flex items-center gap-3">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={label}
            width={56}
            height={56}
            unoptimized
            className="h-14 w-14 rounded-lg border border-[var(--border-subtle)] object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-[var(--border-subtle)] text-[10px] text-[var(--text-light)]">
            None
          </div>
        )}
        <label className="cursor-pointer rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]">
          {uploading ? 'Uploading…' : 'Upload'}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleChange}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}

// --- section configs, grouped for display ---------------------------------

const BRAND_CONFIG: SectionConfig = {
  section: 'brand',
  title: 'Brand Text',
  kind: 'fields',
  fields: [
    { key: 'logoText', label: 'Logo / business name', type: 'text' },
    { key: 'accentEmoji', label: 'Accent emoji', type: 'text' },
    { key: 'tagline', label: 'Tagline', type: 'textarea' },
  ],
};

const BRAND_COLORS_CONFIG: SectionConfig = {
  section: 'brandColors',
  title: 'Brand Colors',
  description: 'Recolors every button, price, and border sitewide. Identical in light and dark mode, same as today.',
  kind: 'fields',
  fields: [
    { key: 'primary', label: 'Primary', type: 'color' },
    { key: 'primaryDeep', label: 'Primary (hover / deep shade)', type: 'color' },
    { key: 'secondary', label: 'Secondary', type: 'color' },
    { key: 'secondaryLight', label: 'Secondary (light shade)', type: 'color' },
    { key: 'accent', label: 'Accent', type: 'color' },
  ],
};

const HERO_CONFIG: SectionConfig = {
  section: 'hero',
  title: 'Hero Text',
  kind: 'fields',
  fields: [
    { key: 'headlineLine1', label: 'Headline line 1', type: 'text' },
    { key: 'headlineLine2', label: 'Headline line 2', type: 'text' },
    { key: 'subheadline', label: 'Subheadline', type: 'textarea' },
    { key: 'ctaPrimaryText', label: 'Primary button text', type: 'text' },
    { key: 'ctaSecondaryText', label: 'Secondary button text', type: 'text' },
    { key: 'desktopVideoUrl', label: 'Desktop video URL', type: 'text' },
  ],
};

const STORY_CONFIG: SectionConfig = {
  section: 'story',
  title: 'Our Story Section',
  kind: 'fields',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'titleLine1', label: 'Title line 1', type: 'text' },
    { key: 'titleLine2', label: 'Title line 2', type: 'text' },
    { key: 'paragraph1', label: 'Paragraph 1', type: 'textarea' },
    { key: 'paragraph2', label: 'Paragraph 2', type: 'textarea' },
    { key: 'stats', label: 'Stats', type: 'json' },
  ],
};

const TRUST_BAR_CONFIG: SectionConfig = {
  section: 'trustBar',
  title: 'Trust Bar',
  kind: 'fields',
  fields: [{ key: 'items', label: 'Items', type: 'newline-array' }],
};

const WHY_CHOOSE_US_CONFIG: SectionConfig = {
  section: 'whyChooseUs',
  title: 'Why Choose Us Section',
  kind: 'fields',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'reasons', label: 'Reasons', type: 'json' },
  ],
};

const STORY_BANNER_CONFIG: SectionConfig = {
  section: 'storyBanner',
  title: 'Story Banner Text',
  kind: 'fields',
  fields: [
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'videoUrl', label: 'Video URL', type: 'text' },
  ],
};

const DELIVERY_CONFIG: SectionConfig = {
  section: 'delivery',
  title: 'Delivery Section',
  kind: 'fields',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
  ],
};

const NEWSLETTER_CONFIG: SectionConfig = {
  section: 'newsletter',
  title: 'Newsletter',
  kind: 'fields',
  fields: [
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'body', label: 'Body', type: 'textarea' },
    { key: 'successMessage', label: 'Success message', type: 'text' },
  ],
};

const FEATURED_COLLECTION_CONFIG: SectionConfig = {
  section: 'featuredCollection',
  title: 'Featured Collection Section',
  kind: 'fields',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
  ],
};

const FAQ_FALLBACK_CONFIG: SectionConfig = {
  section: 'faqFallback',
  title: 'Fallback FAQs',
  description: 'Shown on the homepage FAQ section whenever no admin-managed FAQs exist. Each item needs id, question, answer.',
  kind: 'json-array',
};

const FOOTER_CONFIG: SectionConfig = {
  section: 'footer',
  title: 'Footer',
  kind: 'fields',
  fields: [
    { key: 'tagline', label: 'Tagline', type: 'textarea' },
    { key: 'copyrightSuffix', label: 'Copyright suffix', type: 'text' },
  ],
};

const EMPTY_STATES_CONFIG: SectionConfig = {
  section: 'emptyStates',
  title: 'Empty States',
  kind: 'fields',
  fields: [
    { key: 'cartTitle', label: 'Empty cart title', type: 'text' },
    { key: 'cartSubtitle', label: 'Empty cart subtitle', type: 'text' },
    { key: 'productsEmpty', label: 'No products message', type: 'text' },
    { key: 'notFoundTitle', label: '404 title', type: 'text' },
    { key: 'notFoundBody', label: '404 body', type: 'textarea' },
  ],
};

const PRODUCTS_PAGE_CONFIG: SectionConfig = {
  section: 'productsPage',
  title: 'Products Page',
  kind: 'fields',
  fields: [
    { key: 'title', label: 'Page title', type: 'text' },
    { key: 'intro', label: 'Intro text', type: 'textarea' },
    { key: 'metaDescription', label: 'Meta description', type: 'textarea' },
  ],
};

const LOYALTY_CONFIG: SectionConfig = {
  section: 'loyaltyProgram',
  title: 'Rewards Program Naming',
  description: 'Renames the loyalty program everywhere it appears -- the underlying credit balance/logic is unaffected.',
  kind: 'fields',
  fields: [
    { key: 'name', label: 'Program name', type: 'text' },
    { key: 'currencySingular', label: 'Currency, singular', type: 'text' },
    { key: 'currencyPlural', label: 'Currency, plural', type: 'text' },
    { key: 'currencyTitleCase', label: 'Currency, title case', type: 'text' },
    { key: 'emoji', label: 'Emoji', type: 'text' },
  ],
};

const REVIEW_CATEGORIES_CONFIG: SectionConfig = {
  section: 'reviewCategories',
  title: 'Review Sub-rating Labels',
  kind: 'fields',
  fields: [
    { key: 'tasteLabel', label: 'Category 1 label', type: 'text' },
    { key: 'freshnessLabel', label: 'Category 2 label', type: 'text' },
    { key: 'packagingLabel', label: 'Category 3 label', type: 'text' },
    { key: 'deliveryLabel', label: 'Category 4 label', type: 'text' },
  ],
};

const AI_ASSISTANT_CONFIG: SectionConfig = {
  section: 'aiAssistant',
  title: 'AI Assistant Persona',
  description: 'Shapes how the /chat assistant describes the catalog and products.',
  kind: 'fields',
  fields: [
    { key: 'categoryDescription', label: 'Category description', type: 'textarea' },
    { key: 'productSingular', label: 'Product noun, singular', type: 'text' },
    { key: 'productPlural', label: 'Product noun, plural', type: 'text' },
    { key: 'damagedItemNote', label: 'Damaged-item policy note', type: 'textarea' },
  ],
};

const EMAIL_BRAND_CONFIG: SectionConfig = {
  section: 'emailBrand',
  title: 'Transactional Email Branding',
  kind: 'fields',
  fields: [
    { key: 'headerText', label: 'Email header text', type: 'text' },
    { key: 'footerText', label: 'Email footer text', type: 'text' },
  ],
};

const SITE_META_CONFIG: SectionConfig = {
  section: 'siteMeta',
  title: 'SEO / Metadata',
  kind: 'fields',
  fields: [
    { key: 'defaultTitle', label: 'Default page title', type: 'text' },
    { key: 'titleTemplate', label: 'Title template (%s = page title)', type: 'text' },
    { key: 'defaultDescription', label: 'Default meta description', type: 'textarea' },
    { key: 'ogSubtitle', label: 'Share-card subtitle', type: 'text' },
    { key: 'ogTagline', label: 'Share-card tagline', type: 'text' },
  ],
};

export function ContentEditorClient({ content }: { content: SiteContent }) {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--text)]">Brand &amp; Identity</h2>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-[var(--text)]">Logo &amp; Favicon</h3>
          <div className="flex flex-wrap gap-6">
            <ImageFieldUploader field="brandLogo" label="Logo image" currentUrl={content.brand.logoImageUrl} />
            <ImageFieldUploader field="brandFavicon" label="Favicon" currentUrl={content.brand.faviconUrl} />
          </div>
          <p className="mt-3 text-xs text-[var(--text-light)]">
            Leave both empty to keep the default decorative logo mark. JPG, PNG or WebP, up to 5MB.
          </p>
        </div>
        <SectionCard config={BRAND_CONFIG} data={content.brand} />
        <SectionCard config={BRAND_COLORS_CONFIG} data={content.brandColors} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--text)]">Homepage</h2>
        <SectionCard config={HERO_CONFIG} data={content.hero} />
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-[var(--text)]">Hero Mobile Image</h3>
          <ImageFieldUploader field="heroMobile" label="Mobile hero image" currentUrl={content.hero.mobileImageUrl} />
        </div>
        <SectionCard config={STORY_CONFIG} data={content.story} />
        <SectionCard config={TRUST_BAR_CONFIG} data={content.trustBar} />
        <SectionCard config={WHY_CHOOSE_US_CONFIG} data={content.whyChooseUs} />
        <SectionCard config={STORY_BANNER_CONFIG} data={content.storyBanner} />
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-[var(--text)]">Story Banner Mobile Image</h3>
          <ImageFieldUploader
            field="storyBannerMobile"
            label="Mobile banner image"
            currentUrl={content.storyBanner.mobileImageUrl}
          />
        </div>
        <SectionCard config={DELIVERY_CONFIG} data={content.delivery} />
        <SectionCard config={NEWSLETTER_CONFIG} data={content.newsletter} />
        <SectionCard config={FEATURED_COLLECTION_CONFIG} data={content.featuredCollection} />
        <SectionCard config={FAQ_FALLBACK_CONFIG} data={content.faqFallback} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--text)]">Pages &amp; Empty States</h2>
        <SectionCard config={PRODUCTS_PAGE_CONFIG} data={content.productsPage} />
        <SectionCard config={EMPTY_STATES_CONFIG} data={content.emptyStates} />
        <SectionCard config={FOOTER_CONFIG} data={content.footer} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--text)]">Rewards Program</h2>
        <SectionCard config={LOYALTY_CONFIG} data={content.loyaltyProgram} />
        <SectionCard config={REVIEW_CATEGORIES_CONFIG} data={content.reviewCategories} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--text)]">AI Assistant</h2>
        <SectionCard config={AI_ASSISTANT_CONFIG} data={content.aiAssistant} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--text)]">Emails</h2>
        <SectionCard config={EMAIL_BRAND_CONFIG} data={content.emailBrand} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--text)]">SEO</h2>
        <SectionCard config={SITE_META_CONFIG} data={content.siteMeta} />
      </section>
    </div>
  );
}
