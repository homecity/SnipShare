'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition"
      title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
