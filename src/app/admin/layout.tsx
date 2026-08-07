import { getAdminUser } from '@/lib/dal';
import { getRecentNotifications } from '@/lib/queries/notifications';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();
  const notifications = await getRecentNotifications();

  return (
    <AdminShell name={admin.name ?? admin.email} role={admin.role} notifications={notifications}>
      {children}
    </AdminShell>
  );
}
