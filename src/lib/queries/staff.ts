import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type StaffMember = {
  id: string;
  name: string | null;
  email: string | null;
  role: 'admin' | 'staff';
  createdAt: string;
};

export async function getStaffMembers(): Promise<StaffMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, created_at')
    .in('role', ['admin', 'staff'])
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load staff: ${error.message}`);

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role as 'admin' | 'staff',
    createdAt: p.created_at,
  }));
}
