'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminShell from '../AdminShell';

interface AppSettings {
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  max_file_size_mb: number;
  allowed_file_types: string;
}

interface Stats {
  totalSnippets: number;
  activeSnippets: number;
  todaySnippets: number;
  deletedSnippets: number;
  encryptedSnippets: number;
  burnSnippets: number;
  rateLimitEntries: number;
  fileSnippets: number;
  textSnippets: number;
  totalFileSize: number;
}

export default function AdminSettings() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [editedSettings, setEditedSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json() as AppSettings;
        setSettings(data);
        setEditedSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => setStats(data as Stats))
      .catch(() => {});
  }, [fetchSettings]);

  const hasChanges = settings && editedSettings
    ? JSON.stringify(settings) !== JSON.stringify(editedSettings)
    : false;

  const handleSave = async () => {
    if (!editedSettings || !hasChanges) return;
    setSaving(true);
    setSaveResult(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedSettings),
      });

      const data = await res.json() as { success?: boolean; error?: string; settings?: AppSettings };

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSettings(data.settings || editedSettings);
      setEditedSettings(data.settings || editedSettings);
      setSaveResult({ type: 'success', message: 'Settings saved successfully!' });
      setTimeout(() => setSaveResult(null), 3000);
    } catch (err) {
      setSaveResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setEditedSettings({ ...settings });
      setSaveResult(null);
    }
  };

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (editedSettings) {
      setEditedSettings({ ...editedSettings, [key]: value });
    }
  };

  const isChanged = (key: keyof AppSettings): boolean => {
    if (!settings || !editedSettings) return false;
    return settings[key] !== editedSettings[key];
  };

  const inputClass = (key: keyof AppSettings) =>
    `w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${
      isChanged(key)
        ? 'border-purple-400 ring-1 ring-purple-400/30'
        : 'border-slate-300 dark:border-slate-600'
    }`;

  const STATIC_CONFIG = [
    { name: 'Max Expiration', value: '2 weeks' },
    { name: 'Default Expiration', value: '3 days' },
    { name: 'Snippet ID Length', value: '10 characters (nanoid)' },
    { name: 'Encryption', value: 'AES-256-GCM via Web Crypto API' },
    { name: 'Password Hashing', value: 'PBKDF2 (100,000 iterations, SHA-256)' },
    { name: 'Database', value: 'Cloudflare D1 (SQLite)' },
    { name: 'File Storage', value: 'Cloudflare R2' },
    { name: 'Runtime', value: 'Cloudflare Workers (OpenNext)' },
    { name: 'Domain', value: 'snipit.sh' },
  ];

  const SUPPORTED_LANGUAGES = [
    'plaintext', 'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
    'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'html', 'css', 'scss',
    'json', 'yaml', 'xml', 'markdown', 'sql', 'bash', 'powershell', 'dockerfile',
  ];

  return (
    <AdminShell>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
          {hasChanges && (
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full text-xs animate-pulse">
              Unsaved changes
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-slate-500 dark:text-slate-400">Loading settings...</div>
        ) : editedSettings ? (
          <>
            {/* Rate Limiting Settings */}
            <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm dark:shadow-none">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">🚦 Rate Limiting</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
                Control how many requests each IP can make. Changes apply immediately.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Per Minute
                    {isChanged('rate_limit_per_minute') && (
                      <span className="ml-2 text-purple-600 dark:text-purple-400 text-xs">modified</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={editedSettings.rate_limit_per_minute}
                    onChange={e => updateField('rate_limit_per_minute', parseInt(e.target.value, 10) || 1)}
                    className={inputClass('rate_limit_per_minute')}
                  />
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Snippet creation per minute per IP</p>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Per Hour
                    {isChanged('rate_limit_per_hour') && (
                      <span className="ml-2 text-purple-600 dark:text-purple-400 text-xs">modified</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={editedSettings.rate_limit_per_hour}
                    onChange={e => updateField('rate_limit_per_hour', parseInt(e.target.value, 10) || 1)}
                    className={inputClass('rate_limit_per_hour')}
                  />
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">All creates + uploads per hour per IP</p>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Per Day
                    {isChanged('rate_limit_per_day') && (
                      <span className="ml-2 text-purple-600 dark:text-purple-400 text-xs">modified</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={editedSettings.rate_limit_per_day}
                    onChange={e => updateField('rate_limit_per_day', parseInt(e.target.value, 10) || 1)}
                    className={inputClass('rate_limit_per_day')}
                  />
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Daily total limit per IP</p>
                </div>
              </div>
            </div>

            {/* File Upload Settings */}
            <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm dark:shadow-none">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">📁 File Upload</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
                Configure file upload limits and allowed types.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Max File Size (MB)
                    {isChanged('max_file_size_mb') && (
                      <span className="ml-2 text-purple-600 dark:text-purple-400 text-xs">modified</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editedSettings.max_file_size_mb}
                    onChange={e => updateField('max_file_size_mb', parseInt(e.target.value, 10) || 1)}
                    className={inputClass('max_file_size_mb') + ' max-w-[200px]'}
                  />
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                    Maximum upload size in megabytes (Cloudflare Workers limit: 100MB)
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Allowed File Extensions
                    {isChanged('allowed_file_types') && (
                      <span className="ml-2 text-purple-600 dark:text-purple-400 text-xs">modified</span>
                    )}
                  </label>
                  <textarea
                    value={editedSettings.allowed_file_types}
                    onChange={e => updateField('allowed_file_types', e.target.value)}
                    className={inputClass('allowed_file_types') + ' h-24 font-mono text-sm resize-y'}
                    placeholder=".txt,.md,.pdf,.json,..."
                  />
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                    Comma-separated list of extensions (each must start with a dot)
                  </p>

                  {/* Extension preview tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {editedSettings.allowed_file_types
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean)
                      .map(ext => (
                        <span
                          key={ext}
                          className={`px-2 py-0.5 rounded text-xs ${
                            ext.startsWith('.') && ext.length >= 2
                              ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                              : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300'
                          }`}
                        >
                          {ext}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Save / Reset Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {hasChanges && (
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600/50 text-slate-700 dark:text-slate-300 rounded-lg transition"
                >
                  Reset
                </button>
              )}
              {saveResult && (
                <span
                  className={`text-sm ${
                    saveResult.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {saveResult.type === 'success' ? '✓' : '✕'} {saveResult.message}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="text-red-500 dark:text-red-400">Failed to load settings</div>
        )}

        {/* Static Service Configuration */}
        <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">⚙️ Service Configuration</h3>
          <div className="space-y-3">
            {STATIC_CONFIG.map(cfg => (
              <div key={cfg.name} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/30">
                <span className="text-slate-500 dark:text-slate-400 text-sm">{cfg.name}</span>
                <span className="text-slate-900 dark:text-white text-sm font-mono">{cfg.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics Summary */}
        {stats && (
          <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm dark:shadow-none">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">📊 Statistics Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/20 rounded-lg">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalSnippets}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total</div>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeSnippets}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Active</div>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/20 rounded-lg">
                <div className="text-2xl font-bold text-red-500 dark:text-red-400">{stats.deletedSnippets}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Deleted</div>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.todaySnippets}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Today</div>
              </div>
            </div>
          </div>
        )}

        {/* Supported Languages */}
        <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">🎨 Supported Languages</h3>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map(lang => (
              <span key={lang} className="px-3 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-full text-xs">
                {lang}
              </span>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
