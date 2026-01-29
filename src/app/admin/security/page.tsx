'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminShell from '../AdminShell';

interface IpActivity {
  ip: string;
  action: string;
  count: number;
  lastActivity: number;
}

interface BlockedIp {
  id: number;
  ip: string;
  reason: string | null;
  blocked_at: number;
  blocked_by: string;
}

interface RateLimitLog {
  id: number;
  ip: string;
  action: string;
  timestamp: number;
}

type Tab = 'activity' | 'blocked' | 'logs';

export default function AdminSecurity() {
  const [tab, setTab] = useState<Tab>('activity');
  const [ipActivity, setIpActivity] = useState<IpActivity[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [rateLogs, setRateLogs] = useState<RateLimitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockIp, setBlockIp] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sectionMap: Record<Tab, string> = {
        activity: 'ip-activity',
        blocked: 'blocked',
        logs: 'rate-log',
      };
      const res = await fetch(`/api/admin/security?section=${sectionMap[tab]}`);
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>;
        if (tab === 'activity') setIpActivity((data.ipActivity as IpActivity[]) || []);
        if (tab === 'blocked') setBlockedIps((data.blockedIps as BlockedIp[]) || []);
        if (tab === 'logs') setRateLogs((data.rateLimitLogs as RateLimitLog[]) || []);
      }
    } catch (err) {
      console.error('Failed to fetch security data:', err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBlock = async (ip: string, reason?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'block', ip, reason }),
      });
      if (res.ok) {
        setBlockIp('');
        setBlockReason('');
        fetchData();
      }
    } catch (err) {
      console.error('Block failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblock = async (ip: string) => {
    if (!confirm(`Unblock ${ip}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unblock', ip }),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Unblock failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleString();

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'activity', label: 'IP Activity', icon: '📡' },
    { key: 'blocked', label: 'Blocked IPs', icon: '🚫' },
    { key: 'logs', label: 'Rate Limit Logs', icon: '📋' },
  ];

  return (
    <AdminShell>
      <div className="max-w-6xl">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Security</h2>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-200/80 dark:bg-slate-800/30 p-1 rounded-lg w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                tab === t.key
                  ? 'bg-purple-100 dark:bg-purple-500/30 text-purple-700 dark:text-purple-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-slate-500 dark:text-slate-400">Loading...</div>
        ) : (
          <>
            {/* IP Activity Tab */}
            {tab === 'activity' && (
              <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
                  <h3 className="text-slate-900 dark:text-white font-medium">IP Activity (Last 24 Hours)</h3>
                </div>
                {ipActivity.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">No activity in the last 24 hours</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400">
                          <th className="text-left px-4 py-3 font-medium">IP Address</th>
                          <th className="text-left px-4 py-3 font-medium">Action</th>
                          <th className="text-left px-4 py-3 font-medium">Count</th>
                          <th className="text-left px-4 py-3 font-medium">Last Activity</th>
                          <th className="text-left px-4 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ipActivity.map((item, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                            <td className="px-4 py-3 text-slate-900 dark:text-white font-mono">{item.ip}</td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.action}</td>
                            <td className="px-4 py-3">
                              <span className={`font-medium ${item.count >= 10 ? 'text-red-500 dark:text-red-400' : item.count >= 5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                                {item.count}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatTime(item.lastActivity)}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleBlock(item.ip, `High activity: ${item.count} requests`)}
                                disabled={actionLoading}
                                className="px-3 py-1 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/40 text-red-600 dark:text-red-300 rounded text-xs transition"
                              >
                                Block
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Blocked IPs Tab */}
            {tab === 'blocked' && (
              <div className="space-y-4">
                {/* Block form */}
                <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 shadow-sm dark:shadow-none">
                  <h3 className="text-slate-900 dark:text-white font-medium mb-3">Block IP Address</h3>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="text"
                      value={blockIp}
                      onChange={e => setBlockIp(e.target.value)}
                      placeholder="IP address"
                      className="flex-1 min-w-[200px] px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      value={blockReason}
                      onChange={e => setBlockReason(e.target.value)}
                      placeholder="Reason (optional)"
                      className="flex-1 min-w-[200px] px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => blockIp && handleBlock(blockIp, blockReason)}
                      disabled={!blockIp || actionLoading}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition disabled:opacity-50"
                    >
                      Block IP
                    </button>
                  </div>
                </div>

                {/* Blocked list */}
                <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
                    <h3 className="text-slate-900 dark:text-white font-medium">Blocked IPs ({blockedIps.length})</h3>
                  </div>
                  {blockedIps.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">No blocked IPs</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400">
                            <th className="text-left px-4 py-3 font-medium">IP Address</th>
                            <th className="text-left px-4 py-3 font-medium">Reason</th>
                            <th className="text-left px-4 py-3 font-medium">Blocked At</th>
                            <th className="text-left px-4 py-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {blockedIps.map(item => (
                            <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                              <td className="px-4 py-3 text-slate-900 dark:text-white font-mono">{item.ip}</td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.reason || '-'}</td>
                              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(item.blocked_at * 1000).toLocaleString()}</td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleUnblock(item.ip)}
                                  disabled={actionLoading}
                                  className="px-3 py-1 bg-green-100 dark:bg-green-500/20 hover:bg-green-200 dark:hover:bg-green-500/40 text-green-600 dark:text-green-300 rounded text-xs transition"
                                >
                                  Unblock
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rate Limit Logs Tab */}
            {tab === 'logs' && (
              <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
                  <h3 className="text-slate-900 dark:text-white font-medium">Rate Limit Logs (Last 24 Hours, max 100)</h3>
                </div>
                {rateLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">No rate limit logs</div>
                ) : (
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white dark:bg-slate-800">
                        <tr className="border-b border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400">
                          <th className="text-left px-4 py-3 font-medium">Time</th>
                          <th className="text-left px-4 py-3 font-medium">IP</th>
                          <th className="text-left px-4 py-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rateLogs.map(log => (
                          <tr key={log.id} className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                            <td className="px-4 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatTime(log.timestamp)}</td>
                            <td className="px-4 py-2 text-slate-900 dark:text-white font-mono">{log.ip}</td>
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{log.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}
