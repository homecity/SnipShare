'use client';

import { useState, useEffect } from 'react';
import AdminShell from '../AdminShell';

interface Stats {
  totalSnippets: number;
  activeSnippets: number;
  todaySnippets: number;
  deletedSnippets: number;
  encryptedSnippets: number;
  burnSnippets: number;
  rateLimitEntries: number;
}

export default function AdminSettings() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => setStats(data as Stats))
      .catch(() => {});
  }, []);

  const RATE_LIMIT_CONFIG = [
    { name: 'Create Snippet', limit: '10 requests', window: '1 minute', scope: 'Per IP' },
  ];

  const SERVICE_CONFIG = [
    { name: 'Max Content Size', value: '500 KB' },
    { name: 'Max Expiration', value: '2 weeks' },
    { name: 'Default Expiration', value: '3 days' },
    { name: 'Snippet ID Length', value: '10 characters (nanoid)' },
    { name: 'Encryption', value: 'AES-256-GCM via Web Crypto API' },
    { name: 'Password Hashing', value: 'PBKDF2 (100,000 iterations, SHA-256)' },
    { name: 'Database', value: 'Cloudflare D1 (SQLite)' },
    { name: 'Runtime', value: 'Cloudflare Workers (OpenNext)' },
    { name: 'Domain', value: 'steveyu.au' },
  ];

  const SUPPORTED_LANGUAGES = [
    'plaintext', 'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
    'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'html', 'css', 'scss',
    'json', 'yaml', 'xml', 'markdown', 'sql', 'bash', 'powershell', 'dockerfile',
  ];

  return (
    <AdminShell>
      <div className="max-w-4xl space-y-6">
        <h2 className="text-2xl font-bold text-white">Settings</h2>

        {/* Rate Limit Configuration */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🚦 Rate Limiting</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400">
                  <th className="text-left py-2 pr-4 font-medium">Endpoint</th>
                  <th className="text-left py-2 pr-4 font-medium">Limit</th>
                  <th className="text-left py-2 pr-4 font-medium">Window</th>
                  <th className="text-left py-2 font-medium">Scope</th>
                </tr>
              </thead>
              <tbody>
                {RATE_LIMIT_CONFIG.map(cfg => (
                  <tr key={cfg.name} className="border-b border-slate-700/30">
                    <td className="py-3 pr-4 text-white">{cfg.name}</td>
                    <td className="py-3 pr-4 text-slate-300">{cfg.limit}</td>
                    <td className="py-3 pr-4 text-slate-300">{cfg.window}</td>
                    <td className="py-3 text-slate-300">{cfg.scope}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-slate-500 text-xs mt-3">
            Rate limits are currently hardcoded. Edit src/app/api/snippets/route.ts to modify.
          </p>
        </div>

        {/* Service Configuration */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">⚙️ Service Configuration</h3>
          <div className="space-y-3">
            {SERVICE_CONFIG.map(cfg => (
              <div key={cfg.name} className="flex justify-between items-center py-2 border-b border-slate-700/30">
                <span className="text-slate-400 text-sm">{cfg.name}</span>
                <span className="text-white text-sm font-mono">{cfg.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Service Statistics Summary */}
        {stats && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📊 Statistics Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-slate-700/20 rounded-lg">
                <div className="text-2xl font-bold text-white">{stats.totalSnippets}</div>
                <div className="text-xs text-slate-400 mt-1">Total</div>
              </div>
              <div className="text-center p-3 bg-slate-700/20 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{stats.activeSnippets}</div>
                <div className="text-xs text-slate-400 mt-1">Active</div>
              </div>
              <div className="text-center p-3 bg-slate-700/20 rounded-lg">
                <div className="text-2xl font-bold text-red-400">{stats.deletedSnippets}</div>
                <div className="text-xs text-slate-400 mt-1">Deleted</div>
              </div>
              <div className="text-center p-3 bg-slate-700/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">{stats.todaySnippets}</div>
                <div className="text-xs text-slate-400 mt-1">Today</div>
              </div>
            </div>
          </div>
        )}

        {/* Supported Languages */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🎨 Supported Languages</h3>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map(lang => (
              <span key={lang} className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full text-xs">
                {lang}
              </span>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
