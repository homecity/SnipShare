'use client';

import { useState, useEffect, useRef } from 'react';

const THEMES = [
  { id: 'github-dark', label: 'GitHub Dark', url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css' },
  { id: 'github', label: 'GitHub Light', url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css' },
  { id: 'monokai', label: 'Monokai', url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/monokai.min.css' },
  { id: 'dracula', label: 'Dracula', url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/dracula.min.css' },
  { id: 'nord', label: 'Nord', url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/nord.min.css' },
  { id: 'tokyo-night-dark', label: 'Tokyo Night', url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/tokyo-night-dark.min.css' },
  { id: 'one-dark', label: 'One Dark', url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/atom-one-dark.min.css' },
  { id: 'one-light', label: 'One Light', url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/atom-one-light.min.css' },
  { id: 'vs2015', label: 'VS Dark', url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/vs2015.min.css' },
  { id: 'solarized-dark', label: 'Solarized Dark', url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/solarized-dark.min.css' },
];

const STORAGE_KEY = 'snipit-syntax-theme';

export function getStoredTheme(): typeof THEMES[0] {
  if (typeof window === 'undefined') return THEMES[0];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const found = THEMES.find(t => t.id === stored);
      if (found) return found;
    }
  } catch { /* ignore */ }
  return THEMES[0];
}

export function applySyntaxTheme(theme: typeof THEMES[0]) {
  // Remove existing hljs theme links
  document.querySelectorAll('link[data-hljs-theme]').forEach(el => el.remove());

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = theme.url;
  link.setAttribute('data-hljs-theme', 'true');
  document.head.appendChild(link);
}

interface SyntaxThemeSelectorProps {
  onChange?: () => void;
}

export default function SyntaxThemeSelector({ onChange }: SyntaxThemeSelectorProps) {
  const [current, setCurrent] = useState(THEMES[0]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(getStoredTheme());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectTheme = (theme: typeof THEMES[0]) => {
    setCurrent(theme);
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, theme.id); } catch { /* ignore */ }
    applySyntaxTheme(theme);
    onChange?.();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition text-sm flex items-center gap-2"
        title="Change syntax theme"
      >
        🎨 {current.label}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => selectTheme(theme)}
              className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center gap-2 ${
                current.id === theme.id
                  ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-medium'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              {current.id === theme.id && <span>✓</span>}
              <span className={current.id === theme.id ? '' : 'ml-5'}>{theme.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
