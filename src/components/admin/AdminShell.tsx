'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { AdminNotification } from '@/lib/queries/notifications';
import type { AdminRole } from '@/lib/dal';

export function AdminShell({
  name,
  role,
  businessName,
  notifications,
  children,
}: {
  name: string;
  role: AdminRole;
  businessName: string;
  notifications: AdminNotification[];
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--surface-sunken)]">
      <Sidebar open={sidebarOpen} role={role} businessName={businessName} />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
        />
      )}
      <div className="md:pl-64">
        <Topbar
          name={name}
          notifications={notifications}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
