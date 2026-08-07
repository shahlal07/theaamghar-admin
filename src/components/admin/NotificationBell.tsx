'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { AdminNotification } from '@/lib/queries/notifications';
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/app/admin/notifications/actions';

const TYPE_ICON: Record<string, string> = {
  new_order: '🛒',
  order_cancelled: '❌',
  order_refunded: '↩️',
  low_stock: '⚠️',
  out_of_stock: '🚫',
};

export function NotificationBell({ initial }: { initial: AdminNotification[] }) {
  const [notifications, setNotifications] = useState(initial);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin_notifications_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (payload) => {
          const row = payload.new as AdminNotification;
          setNotifications((prev) => [row, ...prev].slice(0, 50));
          toast.info(row.title, { description: row.message });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleClickNotification(n: AdminNotification) {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      const fd = new FormData();
      fd.set('notificationId', n.id);
      await markNotificationRead(undefined, fd);
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    await markAllNotificationsRead();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative rounded-lg p-2 text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--error)] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2.5">
            <span className="text-sm font-semibold text-[var(--text)]">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-[var(--mango-orange)] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-[var(--text-light)]">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`flex w-full gap-2 border-b border-[var(--border-subtle)] px-4 py-3 text-left transition last:border-b-0 hover:bg-[var(--surface-sunken)] ${
                    n.read ? 'opacity-60' : ''
                  }`}
                >
                  <span className="text-lg">{TYPE_ICON[n.type] ?? '🔔'}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-[var(--text)]">
                      {n.title}
                    </span>
                    <span className="block text-xs text-[var(--text-light)]">{n.message}</span>
                    <span className="mt-0.5 block text-[10px] text-[var(--text-light)]">
                      {new Date(n.created_at).toLocaleString('en-PK')}
                    </span>
                  </span>
                  {!n.read && (
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--mango-orange)]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
