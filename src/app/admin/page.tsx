'use client';

import { useState, useEffect } from 'react';
import AdminShell from './AdminShell';

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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json() as Stats;
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminShell>
      <div className="max-w-6xl">
        <h2 className="text-2xl font-bold text-white mb-6">Dashboard</h2>

        {loading ? (
          <div className="text-slate-400">Loading statistics...</div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Total Snippets"
                value={stats.totalSnippets}
                icon="📋"
                color="purple"
              />
              <StatCard
                title="Active Snippets"
                value={stats.activeSnippets}
                icon="✅"
                color="green"
              />
              <StatCard
                title="Created Today"
                value={stats.todaySnippets}
                icon="📅"
                color="blue"
              />
              <StatCard
                title="Rate Limit Events (24h)"
                value={stats.rateLimitEntries}
                icon="🚦"
                color="yellow"
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Text Snippets"
                value={stats.textSnippets}
                icon="📝"
                color="blue"
              />
              <StatCard
                title="File Uploads"
                value={stats.fileSnippets}
                icon="📁"
                color="green"
              />
              <StatCard
                title="Encrypted"
                value={stats.encryptedSnippets}
                icon="🔒"
                color="purple"
              />
              <StatCard
                title="Burn After Read"
                value={stats.burnSnippets}
                icon="🔥"
                color="orange"
              />
            </div>

            {/* Tertiary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <StatCard
                title="Deleted Snippets"
                value={stats.deletedSnippets}
                icon="🗑️"
                color="red"
              />
              <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">💾</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {stats.totalFileSize < 1024 * 1024
                    ? `${(stats.totalFileSize / 1024).toFixed(1)} KB`
                    : `${(stats.totalFileSize / (1024 * 1024)).toFixed(2)} MB`}
                </div>
                <div className="text-sm text-slate-400">Total File Storage</div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Service Info</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">Database</span>
                  <span className="text-white">Cloudflare D1 (SQLite)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">Runtime</span>
                  <span className="text-white">Cloudflare Workers</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">Max Content Size</span>
                  <span className="text-white">500 KB</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">Max Expiration</span>
                  <span className="text-white">2 Weeks</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">Rate Limit</span>
                  <span className="text-white">10 creates / min / IP</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">Snippet Retention</span>
                  <span className="text-white">{stats.activeSnippets} active / {stats.totalSnippets} total</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-red-400">Failed to load statistics</div>
        )}
      </div>
    </AdminShell>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30',
    orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.purple} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value.toLocaleString()}</div>
      <div className="text-sm text-slate-400">{title}</div>
    </div>
  );
}
