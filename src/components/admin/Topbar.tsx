'use client';

import { useState } from 'react';
import { signOut } from '@/app/admin/actions';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import type { AdminNotification } from '@/lib/queries/notifications';

export function Topbar({
  name,
  notifications,
  onToggleSidebar,
}: {
  name: string;
  notifications: AdminNotification[];
  onToggleSidebar: () => void;
}) {
  const [pending, setPending] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface)]/90 px-5 py-3 backdrop-blur">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="rounded-md p-2 text-[var(--text)] md:hidden"
        aria-label="Toggle menu"
      >
        ☰
      </button>
      <div className="hidden text-sm text-[var(--text-light)] md:block">
        Signed in as <span className="font-medium text-[var(--text)]">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell initial={notifications} />
        <form
        action={async () => {
          setPending(true);
          await signOut();
        }}
      >
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-[var(--border-subtle)] px-3.5 py-1.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--error)] hover:text-[var(--error)] disabled:opacity-60"
        >
          {pending ? 'Signing out…' : 'Sign out'}
        </button>
        </form>
      </div>
    </header>
  );
}
