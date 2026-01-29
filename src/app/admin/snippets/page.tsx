'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminShell from '../AdminShell';

interface SnippetItem {
  id: string;
  title: string | null;
  language: string;
  createdAt: number;
  expiresAt: number | null;
  viewCount: number;
  isEncrypted: boolean;
  burnAfterRead: boolean;
  isDeleted: boolean;
  type: string;
  fileName: string | null;
  fileSize: number | null;
}

interface SnippetResponse {
  snippets: SnippetItem[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminSnippets() {
  const [data, setData] = useState<SnippetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/snippets?${params}`);
      if (res.ok) {
        setData(await res.json() as SnippetResponse);
      }
    } catch (err) {
      console.error('Failed to fetch snippets:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete snippet ${id}?`)) return;
    setDeleting(id);
    try {
      const res = await fetch('/api/admin/snippets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchSnippets();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts * 1000).toLocaleString();
  };

  const formatFileSize = (bytes: number | null): string => {
    if (bytes === null || bytes === undefined) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getExpiryStatus = (expiresAt: number | null) => {
    if (!expiresAt) return { text: 'Never', class: 'text-slate-400' };
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return { text: 'Expired', class: 'text-red-400' };
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    if (hours < 24) return { text: `${hours}h`, class: 'text-yellow-400' };
    const days = Math.floor(hours / 24);
    return { text: `${days}d`, class: 'text-green-400' };
  };

  return (
    <AdminShell>
      <div className="max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-white">Snippets</h2>

          <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by ID or title..."
              className="flex-1 sm:w-64 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm transition"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        {loading ? (
          <div className="text-slate-400">Loading...</div>
        ) : data ? (
          <>
            <div className="text-sm text-slate-400 mb-4">
              {data.total} snippet{data.total !== 1 ? 's' : ''} found
              {search && ` for "${search}"`}
            </div>

            {/* Table */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-slate-400">
                      <th className="text-left px-4 py-3 font-medium">ID</th>
                      <th className="text-left px-4 py-3 font-medium">Type</th>
                      <th className="text-left px-4 py-3 font-medium">Title</th>
                      <th className="text-left px-4 py-3 font-medium">Language</th>
                      <th className="text-left px-4 py-3 font-medium">Created</th>
                      <th className="text-left px-4 py-3 font-medium">Expires</th>
                      <th className="text-left px-4 py-3 font-medium">Views</th>
                      <th className="text-left px-4 py-3 font-medium">Size</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.snippets.map(snippet => {
                      const expiry = getExpiryStatus(snippet.expiresAt);
                      return (
                        <tr key={snippet.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                          <td className="px-4 py-3">
                            <a
                              href={`/${snippet.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 font-mono"
                            >
                              {snippet.id}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            {snippet.type === 'file' ? (
                              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-xs">📁 File</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-600/30 text-slate-300 rounded text-xs">📝 Text</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-white max-w-[200px] truncate">
                            {snippet.title || snippet.fileName || <span className="text-slate-500">Untitled</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-300">{snippet.language}</td>
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                            {formatDate(snippet.createdAt)}
                          </td>
                          <td className={`px-4 py-3 ${expiry.class}`}>{expiry.text}</td>
                          <td className="px-4 py-3 text-slate-300">{snippet.viewCount}</td>
                          <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                            {snippet.type === 'file' ? formatFileSize(snippet.fileSize) : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {snippet.isDeleted && (
                                <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs">Deleted</span>
                              )}
                              {snippet.isEncrypted && (
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">🔒</span>
                              )}
                              {snippet.burnAfterRead && (
                                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded text-xs">🔥</span>
                              )}
                              {!snippet.isDeleted && !snippet.isEncrypted && !snippet.burnAfterRead && (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-xs">Active</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {!snippet.isDeleted && (
                              <button
                                onClick={() => handleDelete(snippet.id)}
                                disabled={deleting === snippet.id}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded text-xs transition disabled:opacity-50"
                              >
                                {deleting === snippet.id ? '...' : 'Delete'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-700/50 transition"
                >
                  ← Previous
                </button>
                <span className="text-slate-400 text-sm px-4">
                  Page {data.page} of {data.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="px-4 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-700/50 transition"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-red-400">Failed to load snippets</div>
        )}
      </div>
    </AdminShell>
  );
}
