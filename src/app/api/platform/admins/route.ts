import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type VendorAdminRow = {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'staff';
  added_at: string;
};

function assertInternalRequest(request: Request) {
  const supplied = request.headers.get('x-nashemann-provisioning-secret');
  const expected = process.env.NASHEMANN_PROVISIONING_SECRET ?? process.env.VENDOR_PROVISION_SECRET ?? '';
  if (!expected || !supplied || supplied !== expected) {
    throw new Response(JSON.stringify({ error: 'Unauthorized platform request.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
}

async function listAuthUsers(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);
  return data.users;
}

async function listVendorAdmins(admin: ReturnType<typeof createAdminClient>, vendorId: string) {
  const { data: rows, error } = await admin
    .from('vendor_admins')
    .select('id, vendor_id, name, email, role, added_at')
    .eq('vendor_id', vendorId)
    .order('added_at', { ascending: true });
  if (error) throw new Error(error.message);

  const users = await listAuthUsers(admin);
  const admins = [] as VendorAdminRow[];
  for (const row of rows ?? []) {
    const authUser = users.find((user) => user.email?.toLowerCase() === row.email.toLowerCase());
    const normalizedRole = row.role === 'owner' ? 'owner' : 'staff';
    if (authUser) {
      const profileRole = normalizedRole === 'owner' ? 'admin' : 'staff';
      const { error: profileError } = await admin
        .from('profiles')
        .update({ role: profileRole, vendor_id: vendorId })
        .eq('id', authUser.id);
      if (profileError) throw new Error(profileError.message);
    }
    admins.push({
      id: authUser?.id ?? row.id,
      name: row.name,
      email: row.email,
      role: normalizedRole,
      added_at: row.added_at,
    });
  }
  return admins;
}

export async function GET(request: Request) {
  try {
    assertInternalRequest(request);
    const vendorId = new URL(request.url).searchParams.get('vendorId')?.trim();
    if (!vendorId) return NextResponse.json({ error: 'vendorId is required.' }, { status: 400 });
    const admin = createAdminClient();
    return NextResponse.json({ admins: await listVendorAdmins(admin, vendorId) });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load vendor admins.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertInternalRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? '');
    const vendorId = String(body.vendorId ?? '').trim();
    const admin = createAdminClient();

    if (action === 'list') {
      if (!vendorId) return NextResponse.json({ error: 'vendorId is required.' }, { status: 400 });
      return NextResponse.json({ admins: await listVendorAdmins(admin, vendorId) });
    }

    if (action === 'create_store') {
      const businessName = String(body.businessName ?? '').trim();
      const subdomain = String(body.subdomain ?? '').trim().toLowerCase();
      const category = String(body.category ?? '').trim();
      const city = String(body.city ?? '').trim();
      const plan = body.plan === 'monthly' ? 'monthly' : 'per_order';
      const ownerName = String(body.ownerName ?? '').trim();
      const ownerEmail = String(body.ownerEmail ?? '').trim().toLowerCase();
      const ownerPassword = String(body.ownerPassword ?? '');
      if (!businessName || !subdomain || !category || !city || !ownerName || !ownerEmail || ownerPassword.length < 8) {
        return NextResponse.json({ error: 'Business, subdomain, category, city, owner name, owner email and an 8+ character password are required.' }, { status: 400 });
      }
      const { data: vendor, error: vendorError } = await admin
        .from('vendors')
        .insert({ name: businessName, subdomain, category, city, plan, status: 'provisioning' })
        .select('id')
        .single();
      if (vendorError || !vendor) {
        return NextResponse.json({ error: vendorError?.code === '23505' ? `Subdomain "${subdomain}" is already taken — pick another one.` : (vendorError?.message ?? 'Could not create the store.') }, { status: 500 });
      }
      try {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email: ownerEmail,
          password: ownerPassword,
          email_confirm: true,
          user_metadata: { name: ownerName, role: 'vendor_admin', vendor_id: vendor.id },
        });
        if (createError || !created.user) throw new Error(createError?.message ?? 'Could not create the owner account.');
        const { error: contactError } = await admin.from('vendor_admins').upsert({ vendor_id: vendor.id, name: ownerName, email: ownerEmail, role: 'owner' }, { onConflict: 'vendor_id,email' });
        if (contactError) throw new Error(contactError.message);
        await admin.from('profiles').update({ role: 'admin', vendor_id: vendor.id }).eq('id', created.user.id);
        const { error: activeError } = await admin.from('vendors').update({ status: 'active' }).eq('id', vendor.id);
        if (activeError) throw new Error(activeError.message);
        return NextResponse.json({ vendorId: vendor.id });
      } catch (error) {
        await admin.from('vendors').update({ status: 'failed' }).eq('id', vendor.id);
        throw error;
      }
    }

    if (!vendorId) return NextResponse.json({ error: 'vendorId is required.' }, { status: 400 });

    if (action === 'add') {
      const name = String(body.name ?? '').trim();
      const email = String(body.email ?? '').trim().toLowerCase();
      const role = body.role === 'admin' ? 'owner' : 'staff';
      if (!name || !email) return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });

      const { data: existing } = await admin.from('vendor_admins').select('id').eq('vendor_id', vendorId).eq('email', email).maybeSingle();
      if (existing) return NextResponse.json({ error: 'That email is already assigned to this store.' }, { status: 409 });

      const password = `Ns-${crypto.randomUUID()}-Aa1!`;
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: role === 'owner' ? 'vendor_admin' : 'vendor_staff', vendor_id: vendorId },
      });
      if (createError || !created.user) return NextResponse.json({ error: createError?.message ?? 'Could not create the vendor admin account.' }, { status: 500 });

      const { data: row, error: rowError } = await admin
        .from('vendor_admins')
        .insert({ vendor_id: vendorId, name, email, role })
        .select('id, name, email, role, added_at')
        .single();
      if (rowError || !row) {
        await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
        return NextResponse.json({ error: rowError?.message ?? 'Could not save vendor admin.' }, { status: 500 });
      }

      await admin.from('profiles').update({ role: role === 'owner' ? 'admin' : 'staff', vendor_id: vendorId }).eq('id', created.user.id);
      return NextResponse.json({ admin: { id: created.user.id, name: row.name, email: row.email, role, added_at: row.added_at } satisfies VendorAdminRow, temporaryPassword: password });
    }

    if (action === 'update') {
      const userId = String(body.userId ?? '').trim();
      const name = String(body.name ?? '').trim();
      const email = String(body.email ?? '').trim().toLowerCase();
      const previousEmail = String(body.previousEmail ?? '').trim().toLowerCase();
      const password = String(body.password ?? '').trim();
      if (!userId || !name || !email) return NextResponse.json({ error: 'User id, name and email are required.' }, { status: 400 });

      const { data: current, error: currentError } = await admin.auth.admin.getUserById(userId);
      if (currentError || !current.user) return NextResponse.json({ error: 'Vendor admin account not found.' }, { status: 404 });

      const lookupEmail = previousEmail || current.user.email?.toLowerCase() || '';
      const { data: row, error: rowError } = await admin.from('vendor_admins').select('id, role, added_at').eq('vendor_id', vendorId).eq('email', lookupEmail).maybeSingle();
      if (rowError || !row) return NextResponse.json({ error: 'Vendor admin is not assigned to this store.' }, { status: 404 });

      const metadata = { ...(current.user.user_metadata ?? {}), name, vendor_id: vendorId, role: row.role === 'owner' ? 'vendor_admin' : 'vendor_staff' };
      const attributes: { email: string; email_confirm: boolean; user_metadata: Record<string, unknown>; password?: string } = { email, email_confirm: true, user_metadata: metadata };
      if (password) attributes.password = password;

      const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(userId, attributes);
      if (updateError || !updated.user) return NextResponse.json({ error: updateError?.message ?? 'Could not update the vendor admin account.' }, { status: 500 });

      const { data: updatedRow, error: updateRowError } = await admin.from('vendor_admins').update({ name, email }).eq('id', row.id).select('id, name, email, role, added_at').single();
      if (updateRowError || !updatedRow) return NextResponse.json({ error: updateRowError?.message ?? 'Could not update vendor admin.' }, { status: 500 });

      await admin.from('profiles').update({ role: updatedRow.role === 'owner' ? 'admin' : 'staff', vendor_id: vendorId }).eq('id', userId);
      return NextResponse.json({ admin: { id: updated.user.id, name: updatedRow.name, email: updatedRow.email, role: updatedRow.role === 'owner' ? 'owner' : 'staff', added_at: updatedRow.added_at } satisfies VendorAdminRow, passwordChanged: Boolean(password) });
    }

    if (action === 'temporary_password') {
      const userId = String(body.userId ?? '').trim();
      if (!userId) return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
      const { data: current, error: currentError } = await admin.auth.admin.getUserById(userId);
      if (currentError || !current.user?.email) return NextResponse.json({ error: 'Vendor admin account not found.' }, { status: 404 });
      const { data: assignment } = await admin.from('vendor_admins').select('id, name, email, role').eq('vendor_id', vendorId).eq('email', current.user.email.toLowerCase()).maybeSingle();
      if (!assignment) return NextResponse.json({ error: 'This account is not assigned to the selected store.' }, { status: 404 });
      const password = `Ns-${crypto.randomUUID()}-Aa1!`;
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password, user_metadata: { ...(current.user.user_metadata ?? {}), must_change_password: true, vendor_id: vendorId, role: assignment.role === 'owner' ? 'vendor_admin' : 'vendor_staff' } });
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
      await admin.from('profiles').update({ role: assignment.role === 'owner' ? 'admin' : 'staff', vendor_id: vendorId }).eq('id', userId);
      await admin.auth.admin.signOut(userId, 'global').catch(() => undefined);
      return NextResponse.json({ temporaryPassword: password, admin: { id: userId, name: assignment.name, email: assignment.email } });
    }

    if (action === 'revoke_sessions') {
      const userId = String(body.userId ?? '').trim();
      if (!userId) return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
      const { error } = await admin.auth.admin.signOut(userId, 'global');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'remove') {
      const userId = String(body.userId ?? '').trim();
      if (!userId) return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
      const { data: current } = await admin.auth.admin.getUserById(userId);
      const email = current.user?.email?.toLowerCase();
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (email) await admin.from('vendor_admins').delete().eq('vendor_id', vendorId).eq('email', email);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unsupported vendor admin action.' }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Vendor admin operation failed.' }, { status: 500 });
  }
}
