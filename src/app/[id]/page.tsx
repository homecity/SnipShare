'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { QRCodeCanvas } from 'qrcode.react';

interface SnippetData {
  id: string;
  content?: string;
  language: string;
  title: string | null;
  viewCount: number;
  createdAt: number;
  expiresAt: number | null;
  burnAfterRead: boolean;
  requiresPassword?: boolean;
}

export default function SnippetPage() {
  const params = useParams();
  const id = params.id as string;

  const [snippet, setSnippet] = useState<SnippetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    fetchSnippet();
  }, [id]);

  const fetchSnippet = async () => {
    try {
      const response = await fetch(`/api/snippets/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Snippet not found');
      }

      setSnippet(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snippet');
    } finally {
      setLoading(false);
    }
  };

  const unlockSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlocking(true);
    setError('');

    try {
      const response = await fetch(`/api/snippets/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlock');
      }

      setSnippet({ ...data, requiresPassword: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect password');
    } finally {
      setUnlocking(false);
    }
  };

  const copyUrlToClipboard = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const copySnippetToClipboard = async () => {
    if (!snippet?.content) return;

    try {
      await navigator.clipboard.writeText(snippet.content);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = snippet.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  const getHighlightedCode = () => {
    if (!snippet?.content) return '';

    if (showRaw) {
      return snippet.content;
    }

    try {
      if (snippet.language === 'plaintext') {
        return hljs.highlightAuto(snippet.content).value;
      }
      return hljs.highlight(snippet.content, { language: snippet.language }).value;
    } catch {
      return hljs.highlightAuto(snippet.content).value;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTimeRemaining = () => {
    if (!snippet?.expiresAt) return null;
    const remaining = snippet.expiresAt - Date.now();
    if (remaining <= 0) return 'Expired';

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
    return 'Less than an hour remaining';
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error && !snippet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl text-white mb-2">Snippet Not Found</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition"
          >
            Create New Snippet
          </Link>
        </div>
      </div>
    );
  }

  // Password protected view
  if (snippet?.requiresPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl text-white mb-2">Password Protected</h1>
            <p className="text-slate-400">This snippet requires a password to view</p>
          </div>

          <form onSubmit={unlockSnippet} className="space-y-4">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              autoFocus
            />

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={unlocking || !password}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {unlocking ? 'Unlocking...' : 'Unlock'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-slate-400 hover:text-white transition">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition flex items-center gap-2"
          >
            <span>←</span>
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold">
              SnipShare
            </span>
          </Link>

          <div className="flex gap-2">
            <button
              onClick={() => setShowQR(!showQR)}
              className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-slate-300 rounded-lg transition"
              title="Show QR Code"
            >
              📱 QR
            </button>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-slate-300 rounded-lg transition"
            >
              {showRaw ? '🎨 Highlight' : '📄 Raw'}
            </button>
            <button
              onClick={copyUrlToClipboard}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition"
            >
              {copiedUrl ? '✓ Copied!' : '🔗 Copy URL'}
            </button>
          </div>
        </div>

        {/* QR Code Modal */}
        {showQR && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
            <div className="bg-slate-800 p-6 rounded-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-white text-lg font-semibold mb-4 text-center">Scan to Share</h3>
              <div className="bg-white p-4 rounded-lg">
                <QRCodeCanvas value={shareUrl} size={200} />
              </div>
              <p className="text-slate-400 text-sm mt-4 text-center max-w-xs break-all">{shareUrl}</p>
            </div>
          </div>
        )}

        {/* Snippet Info */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl text-white font-semibold mb-2">
                {snippet?.title || 'Untitled Snippet'}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                <span className="px-2 py-1 bg-slate-700/50 rounded">
                  {snippet?.language}
                </span>
                <span>👁️ {snippet?.viewCount} view{snippet?.viewCount !== 1 ? 's' : ''}</span>
                {snippet?.createdAt && (
                  <span>📅 {formatDate(snippet.createdAt)}</span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {snippet?.burnAfterRead && (
                <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm flex items-center gap-1">
                  🔥 Burned after reading
                </span>
              )}
              {getTimeRemaining() && (
                <span className="text-slate-400 text-sm">
                  ⏰ {getTimeRemaining()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Burn After Read Warning */}
        {snippet?.burnAfterRead && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
            ⚠️ This snippet has been deleted and cannot be viewed again. Copy the content now if you need it!
          </div>
        )}

        {/* Content */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
            <div className="flex items-center gap-4">
              <span className="text-slate-400 text-sm">
                {snippet?.content?.split('\n').length} lines
              </span>
              <span className="text-slate-400 text-sm">
                {snippet?.content?.length} characters
              </span>
            </div>
            <button
              onClick={copySnippetToClipboard}
              className="px-3 py-1 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm rounded-lg transition"
            >
              {copiedSnippet ? '✓ Copied!' : '📋 Copy Snippet'}
            </button>
          </div>
          <div className="overflow-auto max-h-[70vh]">
            {showRaw ? (
              <pre className="p-4 text-white font-mono text-sm whitespace-pre-wrap break-words">
                {snippet?.content}
              </pre>
            ) : (
              <pre className="p-4">
                <code
                  className={`hljs language-${snippet?.language}`}
                  dangerouslySetInnerHTML={{ __html: getHighlightedCode() }}
                />
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/25 transition"
          >
            Create a new Snippet
          </Link>
        </div>
      </div>
    </div>
  );
}
