'use client';

import { useState } from 'react';

interface EmbedModalProps {
  snippetId: string;
  show: boolean;
  onClose: () => void;
}

export default function EmbedModal({ snippetId, show, onClose }: EmbedModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [height, setHeight] = useState(400);

  if (!show) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://snipit.sh';
  const embedUrl = `${origin}/embed/${snippetId}?theme=${theme}`;
  const rawUrl = `${origin}/api/snippets/${snippetId}/raw`;

  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="${height}" frameborder="0" style="border-radius:8px;border:1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'};"></iframe>`;

  const scriptCode = `<script src="${origin}/embed.js" data-snippet="${snippetId}" data-theme="${theme}" data-height="${height}"></script>`;

  const markdownBadge = `[![View on snipit.sh](https://img.shields.io/badge/snipit.sh-View%20Snippet-purple)](${origin}/${snippetId})`;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Embed Snippet</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Options */}
          <div className="flex gap-4 mb-6">
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Height (px)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Math.max(100, Math.min(1000, Number(e.target.value))))}
                className="w-24 px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm"
                min={100}
                max={1000}
              />
            </div>
          </div>

          {/* Embed Options */}
          <div className="space-y-4">
            {/* iframe */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">iframe</label>
                <button
                  onClick={() => copyToClipboard(iframeCode, 'iframe')}
                  className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-500/30 transition"
                >
                  {copiedField === 'iframe' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-xs text-slate-700 dark:text-slate-300 overflow-auto max-h-20 font-mono">
                {iframeCode}
              </pre>
            </div>

            {/* Script tag */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Script Tag</label>
                <button
                  onClick={() => copyToClipboard(scriptCode, 'script')}
                  className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-500/30 transition"
                >
                  {copiedField === 'script' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-xs text-slate-700 dark:text-slate-300 overflow-auto max-h-20 font-mono">
                {scriptCode}
              </pre>
            </div>

            {/* Raw URL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Raw URL (curl-friendly)</label>
                <button
                  onClick={() => copyToClipboard(rawUrl, 'raw')}
                  className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-500/30 transition"
                >
                  {copiedField === 'raw' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-xs text-slate-700 dark:text-slate-300 overflow-auto font-mono">
                {rawUrl}
              </pre>
            </div>

            {/* Markdown Badge */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Markdown Badge</label>
                <button
                  onClick={() => copyToClipboard(markdownBadge, 'badge')}
                  className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-500/30 transition"
                >
                  {copiedField === 'badge' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-xs text-slate-700 dark:text-slate-300 overflow-auto font-mono">
                {markdownBadge}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
