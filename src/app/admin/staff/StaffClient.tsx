'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import type { StaffMember } from '@/lib/queries/staff';
import { createStaffAccount, changeStaffRole, revokeStaffAccess } from './actions';

function CreateStaffForm() {
  const [state, formAction, pending] = useActionState(createStaffAccount, undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state?.success) {
      toast.success('Account created');
      // No callback on useActionState results other than watching them via
      // effect — same accepted exception as the rest of the app's
      // toast+reset-form pattern (see Phase 17 notes in CLAUDE.md).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)]"
      >
        + Add staff account
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm sm:grid-cols-2"
    >
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Name
        </label>
        <input
          name="name"
          required
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Temporary password
        </label>
        <input
          name="password"
          type="text"
          minLength={8}
          required
          placeholder="At least 8 characters — relay this to them directly"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Role
        </label>
        <select
          name="role"
          defaultValue="staff"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]"
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create account'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function MemberRow({ member, isSelf }: { member: StaffMember; isSelf: boolean }) {
  const [roleState, roleAction, rolePending] = useActionState(changeStaffRole, undefined);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeStaffAccess, undefined);

  useEffect(() => {
    if (roleState?.success) toast.success('Role updated');
    if (roleState?.error) toast.error(roleState.error);
  }, [roleState]);

  useEffect(() => {
    if (revokeState?.success) toast.success('Access revoked');
    if (revokeState?.error) toast.error(revokeState.error);
  }, [revokeState]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-[var(--text)]">
          {member.name ?? 'Unnamed'} {isSelf && <span className="text-[var(--text-light)]">(you)</span>}
        </p>
        <p className="text-xs text-[var(--text-light)]">{member.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <form
          action={(fd) => {
            fd.set('profileId', member.id);
            roleAction(fd);
          }}
        >
          <select
            name="role"
            defaultValue={member.role}
            disabled={isSelf || rolePending}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--mango-orange)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </form>
        <form
          action={(fd) => {
            fd.set('profileId', member.id);
            revokeAction(fd);
          }}
        >
          <button
            type="submit"
            disabled={isSelf || revokePending}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {revokePending ? 'Revoking…' : 'Revoke access'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function StaffClient({
  members,
  currentUserId,
}: {
  members: StaffMember[];
  currentUserId: string;
}) {
  return (
    <div className="space-y-6">
      <CreateStaffForm />
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
        {members.length === 0 ? (
          <p className="text-sm text-[var(--text-light)]">No staff accounts yet.</p>
        ) : (
          members.map((m) => (
            <MemberRow key={m.id} member={m} isSelf={m.id === currentUserId} />
          ))
        )}
      </div>
    </div>
  );
}
