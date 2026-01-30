'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import QRCodeModal from '@/components/QRCodeModal';
import SharePanel from '@/components/SharePanel';
import ThemeToggle from '@/components/ThemeToggle';

interface FileData {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  viewCount: number;
  createdAt: number;
  expiresAt: number | null;
  burnAfterRead: boolean;
  requiresPassword: boolean;
  creatorView?: boolean;
}

interface FileClientProps {
  initialData: FileData;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType === 'application/zip') return '📦';
  if (mimeType.startsWith('text/') || mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('sql') || mimeType.includes('python') || mimeType.includes('sh')) return '📝';
  return '📎';
}

function isTextFile(mimeType: string): boolean {
  return (
    mimeType.startsWith('text/') ||
    mimeType.includes('json') ||
    mimeType.includes('javascript') ||
    mimeType.includes('typescript') ||
    mimeType.includes('xml') ||
    mimeType.includes('sql') ||
    mimeType.includes('python') ||
    mimeType.includes('x-sh')
  );
}

function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/') && mimeType !== 'image/svg+xml';
}

export default function FileClient({ initialData }: FileClientProps) {
  const searchParams = useSearchParams();
  const isCreated = searchParams.get('created') === 'true';

  const [fileData] = useState<FileData>(initialData);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(!initialData.requiresPassword);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTimeRemaining = () => {
    if (!fileData.expiresAt) return null;
    const remaining = fileData.expiresAt - Date.now();
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
    return 'Less than an hour remaining';
  };

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${fileData.id}`
    : '';

  const copyToClipboard = async (text: string) => {
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
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const downloadFile = useCallback(async (pwd?: string) => {
    setDownloading(true);
    setError('');

    try {
      const url = new URL(`/api/files/${fileData.id}`, window.location.origin);
      if (pwd) url.searchParams.set('password', pwd);

      const response = await fetch(url.toString());

      if (!response.ok) {
        const data = await response.json() as { error: string };
        throw new Error(data.error || 'Download failed');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileData.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }, [fileData.id, fileData.fileName]);

  // Load preview for text/image files (non-encrypted only)
  const loadPreview = useCallback(async (pwd?: string) => {
    if (!isTextFile(fileData.fileType) && !isImageFile(fileData.fileType)) return;

    setPreviewLoading(true);
    try {
      const url = new URL(`/api/files/${fileData.id}`, window.location.origin);
      if (pwd) url.searchParams.set('password', pwd);

      const response = await fetch(url.toString());
      if (!response.ok) return;

      if (isImageFile(fileData.fileType)) {
        const blob = await response.blob();
        setImageUrl(URL.createObjectURL(blob));
      } else if (isTextFile(fileData.fileType)) {
        const text = await response.text();
        // Only preview first 10000 chars
        setPreview(text.length > 10000 ? text.slice(0, 10000) + '\n\n... (truncated)' : text);
      }
    } catch {
      // Preview failed, that's ok
    } finally {
      setPreviewLoading(false);
    }
  }, [fileData.id, fileData.fileType]);

  useEffect(() => {
    if (unlocked && !fileData.burnAfterRead) {
      loadPreview();
    }
  }, [unlocked, fileData.burnAfterRead, loadPreview]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlocking(true);
    setError('');

    try {
      // Verify password by trying to download
      const url = new URL(`/api/files/${fileData.id}`, window.location.origin);
      url.searchParams.set('password', password);

      const response = await fetch(url.toString(), { method: 'HEAD' });

      // HEAD might not work, try GET with a range
      if (!response.ok) {
        const getUrl = new URL(`/api/files/${fileData.id}`, window.location.origin);
        getUrl.searchParams.set('password', password);
        const resp = await fetch(getUrl.toString());
        if (!resp.ok) {
          const data = await resp.json() as { error: string };
          throw new Error(data.error || 'Incorrect password');
        }
        // Password is correct, consume the body
        await resp.arrayBuffer();
      }

      setUnlocked(true);

      // Load preview with password
      if (!fileData.burnAfterRead) {
        loadPreview(password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect password');
    } finally {
      setUnlocking(false);
    }
  };

  // Password protected view
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl text-slate-900 dark:text-white mb-2">Password Protected File</h1>
            <p className="text-slate-500 dark:text-slate-400">This file requires a password to download</p>
            <div className="mt-4 flex items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span>{getFileIcon(fileData.fileType)} {fileData.fileName}</span>
              <span>·</span>
              <span>{formatFileSize(fileData.fileSize)}</span>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              autoFocus
            />

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={unlocking || !password}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {unlocking ? 'Verifying...' : 'Unlock'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-2"
          >
            <span>←</span>
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent font-bold">
              snipit.sh
            </span>
          </Link>

          <div className="flex gap-2">
            <ThemeToggle />
            <button
              onClick={() => setShowQR(true)}
              className="px-4 py-2 bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition"
              title="Show QR Code"
            >
              📱 QR
            </button>
            <button
              onClick={() => copyToClipboard(shareUrl)}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition"
            >
              {copiedUrl ? '✓ Copied!' : '🔗 Copy URL'}
            </button>
          </div>
        </div>

        {/* Share Panel (shown after creation) */}
        {isCreated && (
          <SharePanel
            url={shareUrl}
            burnAfterRead={fileData.burnAfterRead}
            onShowQR={() => setShowQR(true)}
            type="file"
          />
        )}

        {/* QR Code Modal */}
        <QRCodeModal url={shareUrl} show={showQR} onClose={() => setShowQR(false)} />

        {/* File Info Card */}
        <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 mb-6 shadow-sm dark:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{getFileIcon(fileData.fileType)}</div>
              <div>
                <h1 className="text-2xl text-slate-900 dark:text-white font-semibold mb-1">
                  {fileData.fileName}
                </h1>
                <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700/50 rounded">
                    {fileData.fileType}
                  </span>
                  <span>{formatFileSize(fileData.fileSize)}</span>
                  <span>👁️ {fileData.viewCount} view{fileData.viewCount !== 1 ? 's' : ''}</span>
                  {fileData.createdAt && (
                    <span>📅 {formatDate(fileData.createdAt)}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {fileData.burnAfterRead && (
                <span className="px-3 py-1 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-300 rounded-full text-sm flex items-center gap-1">
                  🔥 Burns after download
                </span>
              )}
              {getTimeRemaining() && (
                <span className="text-slate-500 dark:text-slate-400 text-sm">
                  ⏰ {getTimeRemaining()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Creator View — burn-after-read: show share panel only */}
        {fileData.creatorView && (
          <div className="mb-6 p-6 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-xl text-center">
            <div className="text-3xl mb-3">🔥</div>
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">Burn After Reading Enabled</h3>
            <p className="text-amber-700 dark:text-amber-400 text-sm mb-1">
              File download is hidden to protect the one-time access.
            </p>
            <p className="text-amber-600 dark:text-amber-500 text-sm">
              Share the link above — the recipient can download the file once, then it will be permanently deleted.
            </p>
          </div>
        )}

        {/* Burn Warning */}
        {fileData.burnAfterRead && !fileData.creatorView && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-300">
            ⚠️ This file will be deleted after downloading. Make sure to save it!
          </div>
        )}

        {/* Download Button — hidden for creator view */}
        {!fileData.creatorView && <div className="mb-6">
          <button
            onClick={() => downloadFile(password || undefined)}
            disabled={downloading}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {downloading ? (
              '⏳ Downloading...'
            ) : (
              <>
                ⬇️ Download {fileData.fileName}
              </>
            )}
          </button>
        </div>}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Preview */}
        {previewLoading && (
          <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 text-center text-slate-500 dark:text-slate-400 shadow-sm dark:shadow-none">
            Loading preview...
          </div>
        )}

        {imageUrl && (
          <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
              <span className="text-slate-500 dark:text-slate-400 text-sm">Preview</span>
            </div>
            <div className="p-4 flex justify-center">
              <img
                src={imageUrl}
                alt={fileData.fileName}
                className="max-w-full max-h-[70vh] rounded-lg"
              />
            </div>
          </div>
        )}

        {preview && (
          <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
              <span className="text-slate-500 dark:text-slate-400 text-sm">Preview</span>
              <span className="text-slate-500 dark:text-slate-400 text-sm">
                {preview.split('\n').length} lines
              </span>
            </div>
            <div className="overflow-auto max-h-[70vh]">
              <pre className="p-4 text-slate-900 dark:text-white font-mono text-sm whitespace-pre-wrap break-words">
                {preview}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/25 transition"
          >
            Share something new
          </Link>
        </div>
      </div>
    </div>
  );
}
