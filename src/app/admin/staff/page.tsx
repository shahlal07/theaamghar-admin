import { requireAdmin } from '@/lib/dal';
import { getStaffMembers } from '@/lib/queries/staff';
import { StaffClient } from './StaffClient';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const admin = await requireAdmin();
  const members = await getStaffMembers();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Staff</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Admin accounts have full access. Staff accounts can manage orders, inventory,
        products, and reviews, but not settings, coupons, shipping rates, the audit log,
        or other accounts.
      </p>
      <StaffClient members={members} currentUserId={admin.id} />
    </div>
  );
}
