'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_ALLOWED_EXTENSIONS as SHARED_ALLOWED_EXTENSIONS } from '@/lib/constants';
import ThemeToggle from '@/components/ThemeToggle';
import SharePanel from '@/components/SharePanel';
import QRCodeModal from '@/components/QRCodeModal';

const LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'html', 'css', 'scss',
  'json', 'yaml', 'xml', 'markdown', 'sql', 'bash', 'powershell', 'dockerfile'
];

const EXPIRATION_OPTIONS = [
  { label: '1 Hour', value: 60 * 60 * 1000 },
  { label: '6 Hours', value: 6 * 60 * 60 * 1000 },
  { label: '1 Day', value: 24 * 60 * 60 * 1000 },
  { label: '3 Days', value: 3 * 24 * 60 * 60 * 1000 },
  { label: '1 Week', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '2 Weeks', value: 14 * 24 * 60 * 60 * 1000 },
  { label: 'Never', value: 0 },
];

// Defaults (overridden by server settings)
const DEFAULT_ALLOWED_EXTENSIONS = SHARED_ALLOWED_EXTENSIONS;

const DEFAULT_MAX_FILE_SIZE_MB = 5;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<'text' | 'file'>('text');

  // Dynamic settings from server
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(DEFAULT_MAX_FILE_SIZE_MB);
  const [allowedExtensions, setAllowedExtensions] = useState(DEFAULT_ALLOWED_EXTENSIONS);

  useEffect(() => {
    fetch('/api/settings/public')
      .then(r => r.ok ? r.json() : null)
      .then((raw) => {
        const data = raw as { max_file_size_mb?: number; allowed_file_types?: string } | null;
        if (data) {
          if (data.max_file_size_mb) setMaxFileSizeMb(data.max_file_size_mb);
          if (data.allowed_file_types) {
            setAllowedExtensions(data.allowed_file_types.split(',').map((s: string) => s.trim()).filter(Boolean));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Text state
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('plaintext');

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared state
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState(EXPIRATION_OPTIONS[3].value);
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Created snippet state (shown after creation instead of navigating away)
  const [createdSnippet, setCreatedSnippet] = useState<{
    id: string;
    title?: string;
    type: 'text' | 'file';
    burnAfterRead: boolean;
  } | null>(null);
  const [showQR, setShowQR] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (f: File): string | null => {
    const maxBytes = maxFileSizeMb * 1024 * 1024;
    if (f.size > maxBytes) {
      return `File too large (${formatFileSize(f.size)}). Maximum is ${maxFileSizeMb}MB.`;
    }
    if (f.size === 0) {
      return 'File is empty.';
    }
    const ext = f.name.lastIndexOf('.') >= 0
      ? f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
      : '';
    if (!ext || !allowedExtensions.includes(ext)) {
      return `File type "${ext || 'unknown'}" is not allowed.`;
    }
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const err = validateFile(droppedFile);
      if (err) {
        setError(err);
        return;
      }
      setError('');
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const err = validateFile(selectedFile);
      if (err) {
        setError(err);
        return;
      }
      setError('');
      setFile(selectedFile);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('Please enter some content');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          title: title || undefined,
          language,
          password: password || undefined,
          expiresIn: expiresIn || undefined,
          burnAfterRead,
        }),
      });

      const data = await response.json() as { id?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create snippet');
      }

      if (burnAfterRead) {
        // For burn-after-read: show success panel in-page (don't navigate to /{id} which would trigger burn)
        setCreatedSnippet({
          id: data.id!,
          title: title || undefined,
          type: 'text',
          burnAfterRead: true,
        });
      } else {
        // For normal snippets: navigate to the snippet page
        router.push(`/${data.id}?created=true`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (password) formData.append('password', password);
      if (expiresIn) formData.append('expiresIn', String(expiresIn));
      formData.append('burnAfterRead', String(burnAfterRead));

      // Use XMLHttpRequest for progress tracking
      const data = await new Promise<{ id?: string; error?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/files');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          try {
            const resp = JSON.parse(xhr.responseText);
            if (xhr.status >= 400) {
              reject(new Error(resp.error || 'Upload failed'));
            } else {
              resolve(resp);
            }
          } catch {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      if (data.id) {
        if (burnAfterRead) {
          // For burn-after-read: show success panel in-page
          setCreatedSnippet({
            id: data.id,
            title: file.name,
            type: 'file',
            burnAfterRead: true,
          });
        } else {
          router.push(`/${data.id}?created=true`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8 relative">
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              snipit.sh
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Share text, code, and files securely</p>
        </header>

        {/* Created Snippet Success Panel */}
        {createdSnippet && (
          <>
            <SharePanel
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/${createdSnippet.id}`}
              burnAfterRead={createdSnippet.burnAfterRead}
              onShowQR={() => setShowQR(true)}
              type={createdSnippet.type === 'file' ? 'file' : 'snippet'}
            />
            <QRCodeModal
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/${createdSnippet.id}`}
              show={showQR}
              onClose={() => setShowQR(false)}
            />
            <div className="mb-6 text-center">
              <button
                onClick={() => {
                  setCreatedSnippet(null);
                  setContent('');
                  setTitle('');
                  setFile(null);
                  setPassword('');
                  setBurnAfterRead(false);
                  setError('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/25 transition"
              >
                Create another
              </button>
            </div>
          </>
        )}

        {/* Security Banner */}
        {!createdSnippet && (
          <div className="mb-6 px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 rounded-lg flex items-center gap-3">
            <span className="text-xl shrink-0">🛡️</span>
            <p className="text-emerald-700 dark:text-emerald-300 text-sm">
              <span className="font-semibold">Encrypted at rest.</span>{' '}
              All snippets and files are securely encrypted before storage — even administrators cannot access your data.
            </p>
          </div>
        )}

        {/* Tabs — hidden when showing created snippet */}
        {!createdSnippet && <div className="flex justify-center mb-6">
          <div className="inline-flex bg-slate-200/80 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg p-1">
            <button
              onClick={() => { setTab('text'); setError(''); }}
              className={`px-6 py-2 rounded-md text-sm font-medium transition ${
                tab === 'text'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              📝 Text
            </button>
            <button
              onClick={() => { setTab('file'); setError(''); }}
              className={`px-6 py-2 rounded-md text-sm font-medium transition ${
                tab === 'file'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              📁 File
            </button>
          </div>
        </div>}

        {/* Text Tab */}
        {!createdSnippet && tab === 'text' && (
          <form onSubmit={handleTextSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                maxLength={100}
              />
            </div>

            <div>
              <textarea
                placeholder="Paste your text or code here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-64 px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition font-mono text-sm resize-y"
                required
              />
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Expires In</label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                >
                  {EXPIRATION_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Password (optional)</label>
                <input
                  type="password"
                  placeholder="Set a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center space-x-3 cursor-pointer py-2">
                  <input
                    type="checkbox"
                    checked={burnAfterRead}
                    onChange={(e) => setBurnAfterRead(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-slate-700 dark:text-slate-300">Burn after reading</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Snippet'}
            </button>
          </form>
        )}

        {/* File Tab */}
        {!createdSnippet && tab === 'file' && (
          <form onSubmit={handleFileSubmit} className="space-y-6">
            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
                dragActive
                  ? 'border-purple-400 bg-purple-100/50 dark:bg-purple-500/10'
                  : file
                  ? 'border-green-400 dark:border-green-500/50 bg-green-50 dark:bg-green-500/5'
                  : 'border-slate-300 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-500/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept={allowedExtensions.join(',')}
                className="hidden"
              />

              {file ? (
                <div>
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-slate-900 dark:text-white font-medium text-lg mb-1">{file.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{formatFileSize(file.size)}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="mt-3 px-4 py-1.5 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600/50 text-slate-700 dark:text-slate-300 rounded-lg text-sm transition"
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3">📤</div>
                  <p className="text-slate-900 dark:text-white font-medium text-lg mb-1">
                    Drop a file here or click to browse
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Max {maxFileSizeMb}MB · Text, code, images, PDF, ZIP
                  </p>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {isSubmitting && uploadProgress > 0 && (
              <div className="w-full bg-slate-200 dark:bg-slate-800/50 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
                <p className="text-slate-500 dark:text-slate-400 text-sm text-center mt-2">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Expires In</label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                >
                  {EXPIRATION_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Password (optional)</label>
                <input
                  type="password"
                  placeholder="Set a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center space-x-3 cursor-pointer py-2">
                  <input
                    type="checkbox"
                    checked={burnAfterRead}
                    onChange={(e) => setBurnAfterRead(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-slate-700 dark:text-slate-300">Burn after reading</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !file}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? `Uploading... ${uploadProgress}%` : 'Upload File'}
            </button>
          </form>
        )}

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="p-6 bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm dark:shadow-none">
            <div className="text-3xl mb-3">📁</div>
            <h3 className="text-slate-900 dark:text-white font-semibold mb-2">File Sharing</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Upload and share files up to 5MB securely</p>
          </div>
          <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 rounded-xl shadow-sm dark:shadow-none">
            <div className="text-3xl mb-3">🔐</div>
            <h3 className="text-slate-900 dark:text-white font-semibold mb-2">Encrypted Storage</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">All content is AES-256 encrypted at rest by default — zero access for anyone but you</p>
          </div>
          <div className="p-6 bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm dark:shadow-none">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-slate-900 dark:text-white font-semibold mb-2">Password Protection</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Add an extra layer of password encryption on top</p>
          </div>
          <div className="p-6 bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm dark:shadow-none">
            <div className="text-3xl mb-3">⏰</div>
            <h3 className="text-slate-900 dark:text-white font-semibold mb-2">Auto-Expiration</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Set snippets to expire automatically after a set time</p>
          </div>
          <div className="p-6 bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm dark:shadow-none">
            <div className="text-3xl mb-3">🔥</div>
            <h3 className="text-slate-900 dark:text-white font-semibold mb-2">Burn After Reading</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">One-time view that deletes after being accessed</p>
          </div>
        </div>

        <footer className="mt-12 text-center text-slate-500 dark:text-slate-500 text-sm space-y-3">
          <p>No login required. Your snippets are yours.</p>
          <div className="flex justify-center gap-4">
            <a href="/diff" className="hover:text-purple-500 transition">🔀 Diff Tool</a>
            <a href="https://github.com/homecity/SnipShare" target="_blank" rel="noopener noreferrer" className="hover:text-purple-500 transition">GitHub</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
