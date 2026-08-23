import type { Metadata } from 'next';
import { getAdminUser } from '@/lib/dal';
import { getRecentNotifications } from '@/lib/queries/notifications';
import { AdminShell } from '@/components/admin/AdminShell';

export async function generateMetadata(): Promise<Metadata> {
  const admin = await getAdminUser();
  return { title: `${admin.vendor_name} Admin` };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();
  const notifications = await getRecentNotifications();

  return (
    <AdminShell name={admin.name ?? admin.email} role={admin.role} businessName={admin.vendor_name} notifications={notifications}>
      {children}
    </AdminShell>
  );
}
