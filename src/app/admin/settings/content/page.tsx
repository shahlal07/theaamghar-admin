import { requireAdmin } from '@/lib/dal';
import { getSiteContent } from '@/lib/queries/site-content';
import { ContentEditorClient } from './ContentEditorClient';

export const dynamic = 'force-dynamic';

export default async function SiteContentPage() {
  await requireAdmin();
  const content = await getSiteContent();

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Website Content</h1>
        <p className="text-sm text-[var(--text-light)]">
          Every headline, body copy, and image on the storefront -- edit here and it goes live
          immediately, no code deploy. Leave a field blank to fall back to its default rather than
          showing nothing.
        </p>
      </div>
      <ContentEditorClient content={content} />
    </div>
  );
}
