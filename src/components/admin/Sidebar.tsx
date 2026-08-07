'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './nav-items';
import type { AdminRole } from '@/lib/dal';

// "Main" items are always-visible buttons; every other section collapses
// behind its own header button (click to expand/collapse) so the sidebar
// stops growing every time a new admin section gets added -- was a flat
// always-expanded list of ~20 items before this.
const COLLAPSIBLE_SECTIONS = ['Management', 'Insights', 'Settings'] as const;

function isItemActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

export function Sidebar({ open, role }: { open: boolean; role: AdminRole }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => role === 'admin' || !item.adminOnly);
  const mainItems = visibleItems.filter((item) => item.section === 'Main');

  // Whichever collapsible section contains the current route starts open,
  // so navigating to e.g. Coupons doesn't leave it hidden behind a closed
  // Management dropdown with no indication of where you are.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const section of COLLAPSIBLE_SECTIONS) {
      const items = visibleItems.filter((item) => item.section === section);
      if (items.some((item) => isItemActive(pathname, item.href))) initial.add(section);
    }
    return initial;
  });

  function toggleSection(section: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface)] transition-transform duration-200 md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--mango-orange)] text-sm font-extrabold text-white shadow-md">
          AG
        </div>
        <div className="text-lg font-bold text-[var(--text)]">
          The<span className="text-[var(--mango-orange)]">AamGhar</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {mainItems.map((item) => {
          const active = isItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-[var(--mango-orange)]/15 text-[var(--mango-orange)]'
                  : 'text-[var(--text-light)] hover:bg-[var(--mango-orange)]/8 hover:text-[var(--text)]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        <div className="my-3 border-t border-[var(--border-subtle)]" />

        {COLLAPSIBLE_SECTIONS.map((section) => {
          const items = visibleItems.filter((item) => item.section === section);
          if (items.length === 0) return null;
          const isOpen = expanded.has(section);
          const hasActiveChild = items.some((item) => isItemActive(pathname, item.href));

          return (
            <div key={section}>
              <button
                type="button"
                onClick={() => toggleSection(section)}
                aria-expanded={isOpen}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  hasActiveChild
                    ? 'text-[var(--mango-orange)]'
                    : 'text-[var(--text-light)] hover:bg-[var(--mango-orange)]/8 hover:text-[var(--text)]'
                }`}
              >
                {section}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="14"
                  height="14"
                  className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {isOpen && (
                <div className="mt-0.5 flex flex-col gap-0.5 pl-2">
                  {items.map((item) => {
                    const active = isItemActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                          active
                            ? 'bg-[var(--mango-orange)]/15 text-[var(--mango-orange)]'
                            : 'text-[var(--text-light)] hover:bg-[var(--mango-orange)]/8 hover:text-[var(--text)]'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
