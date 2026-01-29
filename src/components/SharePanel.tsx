'use client';

import { useState } from 'react';

interface SharePanelProps {
  url: string;
  burnAfterRead: boolean;
  onShowQR: () => void;
  type?: 'snippet' | 'file';
}

export default function SharePanel({ url, burnAfterRead, onShowQR, type = 'snippet' }: SharePanelProps) {
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const label = type === 'file' ? 'file' : 'snippet';

  return (
    <div className="animate-slide-down mb-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 rounded-xl p-5 relative">
      {/* Close button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-200 transition text-lg leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">✅</span>
        <h3 className="text-emerald-800 dark:text-emerald-300 font-semibold text-lg">
          Your {label} has been created!
        </h3>
      </div>

      <p className="text-emerald-700 dark:text-emerald-400 text-sm mb-3">Share this link:</p>

      {/* URL field + Copy */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center bg-white dark:bg-slate-800/70 border border-emerald-300 dark:border-slate-600 rounded-lg px-3 py-2 overflow-hidden">
          <span className="text-slate-800 dark:text-slate-200 text-sm font-mono truncate">{url}</span>
        </div>
        <button
          onClick={copyUrl}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white'
          }`}
        >
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={onShowQR}
          className="px-4 py-2 bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-emerald-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm transition"
        >
          📱 Show QR Code
        </button>
        <button
          onClick={copyUrl}
          className="px-4 py-2 bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-emerald-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm transition"
        >
          📋 Copy URL
        </button>
      </div>

      {/* Burn warning */}
      {burnAfterRead && (
        <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-lg">
          <span className="text-amber-600 dark:text-amber-400 shrink-0">⚠️</span>
          <p className="text-amber-700 dark:text-amber-300 text-sm">
            <span className="font-semibold">Save this link</span> — this {label} will be deleted after it&apos;s viewed once (burn-after-read is enabled).
          </p>
        </div>
      )}
    </div>
  );
}
