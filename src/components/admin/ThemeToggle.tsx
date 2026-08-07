'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'theaamghar_admin_theme';

function applyTheme(theme: Theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem(STORAGE_KEY);
  } else {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    // localStorage isn't available during SSR, so this can't be a lazy
    // useState initializer without causing a hydration mismatch (the server
    // has no saved preference to render). Reading it post-hydration in an
    // effect — syncing with an external system outside React — is the
    // sanctioned exception to "avoid setState in effects".
    const saved = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  function cycle() {
    const next: Theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
    applyTheme(next);
  }

  const icon = theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🖥️';
  const label =
    theme === 'light' ? 'Light theme' : theme === 'dark' ? 'Dark theme' : 'System theme';

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${label}. Click to change.`}
      title={label}
      className="rounded-lg p-2 text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
    >
      {icon}
    </button>
  );
}
