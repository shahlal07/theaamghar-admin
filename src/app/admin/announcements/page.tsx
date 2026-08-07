import { requireAdmin } from '@/lib/dal';
import { AnnouncementForm } from './AnnouncementForm';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Announcements</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Send a one-off notification (in-app + email) to every customer who hasn&apos;t opted out
        of that category in their settings.
      </p>
      <AnnouncementForm />
    </div>
  );
}
