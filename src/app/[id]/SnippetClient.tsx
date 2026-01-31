'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCodeModal from '@/components/QRCodeModal';
import SharePanel from '@/components/SharePanel';
import ThemeToggle from '@/components/ThemeToggle';
import SyntaxThemeSelector, { getStoredTheme, applySyntaxTheme } from '@/components/SyntaxThemeSelector';
import EmbedModal from '@/components/EmbedModal';

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
  creatorView?: boolean;
}

interface SnippetClientProps {
  initialData: SnippetData;
}

export default function SnippetClient({ initialData }: SnippetClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isCreated = searchParams.get('created') === 'true';

  const [snippet, setSnippet] = useState<SnippetData>(initialData);
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  // Dynamic import of highlight.js
  const highlightCode = useCallback(async (content: string, language: string) => {
    const hljs = (await import('highlight.js/lib/core')).default;

    // Dynamically load only needed languages
    const langMap: Record<string, () => Promise<{ default: unknown }>> = {
      javascript: () => import('highlight.js/lib/languages/javascript'),
      typescript: () => import('highlight.js/lib/languages/typescript'),
      python: () => import('highlight.js/lib/languages/python'),
      java: () => import('highlight.js/lib/languages/java'),
      c: () => import('highlight.js/lib/languages/c'),
      cpp: () => import('highlight.js/lib/languages/cpp'),
      csharp: () => import('highlight.js/lib/languages/csharp'),
      go: () => import('highlight.js/lib/languages/go'),
      rust: () => import('highlight.js/lib/languages/rust'),
      ruby: () => import('highlight.js/lib/languages/ruby'),
      php: () => import('highlight.js/lib/languages/php'),
      swift: () => import('highlight.js/lib/languages/swift'),
      kotlin: () => import('highlight.js/lib/languages/kotlin'),
      scala: () => import('highlight.js/lib/languages/scala'),
      html: () => import('highlight.js/lib/languages/xml'),
      css: () => import('highlight.js/lib/languages/css'),
      scss: () => import('highlight.js/lib/languages/scss'),
      json: () => import('highlight.js/lib/languages/json'),
      yaml: () => import('highlight.js/lib/languages/yaml'),
      xml: () => import('highlight.js/lib/languages/xml'),
      markdown: () => import('highlight.js/lib/languages/markdown'),
      sql: () => import('highlight.js/lib/languages/sql'),
      bash: () => import('highlight.js/lib/languages/bash'),
      powershell: () => import('highlight.js/lib/languages/powershell'),
      dockerfile: () => import('highlight.js/lib/languages/dockerfile'),
    };

    if (language !== 'plaintext' && langMap[language]) {
      const langModule = await langMap[language]();
      hljs.registerLanguage(language, langModule.default as never);
      return hljs.highlight(content, { language }).value;
    }

    // For plaintext or unknown, try auto-detect with common languages
    const commonLangs = ['javascript', 'python', 'json', 'bash', 'html', 'css'];
    for (const lang of commonLangs) {
      if (langMap[lang]) {
        const mod = await langMap[lang]();
        hljs.registerLanguage(lang, mod.default as never);
      }
    }
    return hljs.highlightAuto(content).value;
  }, []);

  useEffect(() => {
    if (snippet.content && !showRaw) {
      highlightCode(snippet.content, snippet.language).then(setHighlightedHtml);
      // Load syntax theme from user preference
      if (!document.querySelector('link[data-hljs-theme]')) {
        applySyntaxTheme(getStoredTheme());
      }
    }
  }, [snippet.content, snippet.language, showRaw, highlightCode]);

  const handleThemeChange = () => {
    // Re-highlight with the new theme (CSS swap is handled by the component)
    if (snippet.content && !showRaw) {
      highlightCode(snippet.content, snippet.language).then(setHighlightedHtml);
    }
  };

  const unlockSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlocking(true);
    setError('');

    try {
      const response = await fetch(`/api/snippets/${snippet.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json() as SnippetData & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlock');
      }

      setSnippet({ ...data, requiresPassword: false } as SnippetData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect password');
    } finally {
      setUnlocking(false);
    }
  };

  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
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
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTimeRemaining = () => {
    if (!snippet.expiresAt) return null;
    const remaining = snippet.expiresAt - Date.now();
    if (remaining <= 0) return 'Expired';

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
    return 'Less than an hour remaining';
  };

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${snippet.id}`
    : '';

  const downloadAsFile = () => {
    if (!snippet.content) return;
    const extMap: Record<string, string> = {
      javascript: '.js', typescript: '.ts', python: '.py', java: '.java',
      c: '.c', cpp: '.cpp', csharp: '.cs', go: '.go', rust: '.rs',
      ruby: '.rb', php: '.php', swift: '.swift', kotlin: '.kt', scala: '.scala',
      html: '.html', css: '.css', scss: '.scss', json: '.json', yaml: '.yaml',
      xml: '.xml', markdown: '.md', sql: '.sql', bash: '.sh',
      powershell: '.ps1', dockerfile: '', plaintext: '.txt',
    };
    const ext = extMap[snippet.language] ?? '.txt';
    const filename = (snippet.title || `snippet-${snippet.id}`) + ext;
    const blob = new Blob([snippet.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const forkSnippet = () => {
    if (!snippet.content) return;
    const params = new URLSearchParams();
    params.set('fork', snippet.id);
    params.set('lang', snippet.language);
    if (snippet.title) params.set('title', snippet.title);
    // Store content in sessionStorage for fork (URL length limits)
    sessionStorage.setItem('snipit-fork-content', snippet.content);
    router.push(`/?${params.toString()}`);
  };

  // Render line numbers alongside code
  const renderWithLineNumbers = (html: string, raw: boolean) => {
    const content = snippet.content || '';
    const lines = content.split('\n');
    const lineCount = lines.length;

    if (!showLineNumbers || lineCount === 0) {
      if (raw) {
        return (
          <pre className="p-4 text-slate-900 dark:text-white font-mono text-sm whitespace-pre-wrap break-words">
            {content}
          </pre>
        );
      }
      return (
        <pre className="p-4">
          <code
            className={`hljs language-${snippet.language}`}
            dangerouslySetInnerHTML={{ __html: html || content }}
          />
        </pre>
      );
    }

    return (
      <div className="flex">
        <div className="select-none text-right pr-4 pl-4 py-4 text-slate-400 dark:text-slate-600 font-mono text-sm border-r border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 shrink-0"
          aria-hidden="true"
        >
          {lines.map((_, i) => (
            <div key={i} className="leading-relaxed">{i + 1}</div>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          {raw ? (
            <pre className="p-4 text-slate-900 dark:text-white font-mono text-sm whitespace-pre leading-relaxed">
              {content}
            </pre>
          ) : (
            <pre className="p-4 leading-relaxed">
              <code
                className={`hljs language-${snippet.language}`}
                dangerouslySetInnerHTML={{ __html: html || content }}
              />
            </pre>
          )}
        </div>
      </div>
    );
  };

  // Password protected view
  if (snippet.requiresPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl text-slate-900 dark:text-white mb-2">Password Protected</h1>
            <p className="text-slate-500 dark:text-slate-400">This snippet requires a password to view</p>
          </div>

          <form onSubmit={unlockSnippet} className="space-y-4">
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
              {unlocking ? 'Unlocking...' : 'Unlock'}
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

          <div className="flex gap-2 flex-wrap justify-end">
            <ThemeToggle />
            {!showRaw && <SyntaxThemeSelector onChange={handleThemeChange} />}
            {/* Hide QR and Copy URL for burn-after-read snippets (already consumed) */}
            {!snippet.burnAfterRead && (
              <button
                onClick={() => setShowQR(!showQR)}
                className="px-3 py-2 bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition text-sm"
                title="Show QR Code"
              >
                📱 QR
              </button>
            )}
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="px-3 py-2 bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition text-sm"
            >
              {showRaw ? '🎨 Highlight' : '📄 Raw'}
            </button>
            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={`px-3 py-2 border rounded-lg transition text-sm ${
                showLineNumbers
                  ? 'bg-purple-100 dark:bg-purple-500/20 border-purple-300 dark:border-purple-500/50 text-purple-700 dark:text-purple-300'
                  : 'bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title="Toggle line numbers"
            >
              #
            </button>
            {!snippet.burnAfterRead && snippet.content && (
              <>
                <button
                  onClick={downloadAsFile}
                  className="px-3 py-2 bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition text-sm"
                  title="Download as file"
                >
                  ⬇️ Download
                </button>
                <button
                  onClick={forkSnippet}
                  className="px-3 py-2 bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition text-sm"
                  title="Fork this snippet"
                >
                  🍴 Fork
                </button>
                <button
                  onClick={() => setShowEmbed(true)}
                  className="px-3 py-2 bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition text-sm"
                  title="Embed this snippet"
                >
                  &lt;/&gt; Embed
                </button>
              </>
            )}
            {!snippet.burnAfterRead && (
              <button
                onClick={() => copyToClipboard(shareUrl, setCopiedUrl)}
                className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition text-sm"
              >
                {copiedUrl ? '✓ Copied!' : '🔗 Copy URL'}
              </button>
            )}
          </div>
        </div>

        {/* Share Panel (shown after creation, but not for burn-after-read) */}
        {isCreated && !snippet.burnAfterRead && (
          <SharePanel
            url={shareUrl}
            burnAfterRead={snippet.burnAfterRead}
            onShowQR={() => setShowQR(true)}
            type="snippet"
          />
        )}

        {/* QR Code Modal */}
        {!snippet.burnAfterRead && (
          <QRCodeModal url={shareUrl} show={showQR} onClose={() => setShowQR(false)} />
        )}

        {/* Embed Modal */}
        <EmbedModal
          snippetId={snippet.id}
          show={showEmbed}
          onClose={() => setShowEmbed(false)}
        />

        {/* Snippet Info */}
        <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 mb-6 shadow-sm dark:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl text-slate-900 dark:text-white font-semibold mb-2">
                {snippet.title || 'Untitled Snippet'}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700/50 rounded">
                  {snippet.language}
                </span>
                <span>👁️ {snippet.viewCount} view{snippet.viewCount !== 1 ? 's' : ''}</span>
                {snippet.createdAt && (
                  <span>📅 {formatDate(snippet.createdAt)}</span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {snippet.burnAfterRead && (
                <span className="px-3 py-1 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-300 rounded-full text-sm flex items-center gap-1">
                  🔥 Burned after reading
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

        {/* Burn After Read Warning — shown when snippet will be burned after this view */}
        {snippet.burnAfterRead && !snippet.creatorView && snippet.viewCount >= 2 && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-300">
            ⚠️ This snippet has been deleted and cannot be viewed again. Copy the content now if you need it!
          </div>
        )}

        {/* Creator View — burn-after-read: show share panel only, no content */}
        {snippet.creatorView && (
          <div className="mb-6 p-6 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-xl text-center">
            <div className="text-3xl mb-3">🔥</div>
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">Burn After Reading Enabled</h3>
            <p className="text-amber-700 dark:text-amber-400 text-sm mb-1">
              Content is hidden to protect the one-time view.
            </p>
            <p className="text-amber-600 dark:text-amber-500 text-sm">
              Share the link above — the recipient will see the content once, then it will be permanently deleted.
            </p>
          </div>
        )}

        {/* Content — hidden for creator view of burn-after-read */}
        {!snippet.creatorView && <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center gap-4">
              <span className="text-slate-500 dark:text-slate-400 text-sm">
                {snippet.content?.split('\n').length} lines
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-sm">
                {snippet.content?.length} characters
              </span>
            </div>
            <button
              onClick={() => snippet.content && copyToClipboard(snippet.content, setCopiedSnippet)}
              className="px-3 py-1 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600/50 text-slate-700 dark:text-slate-300 text-sm rounded-lg transition"
            >
              {copiedSnippet ? '✓ Copied!' : '📋 Copy Snippet'}
            </button>
          </div>
          <div className="overflow-auto max-h-[70vh]">
            {renderWithLineNumbers(highlightedHtml, showRaw)}
          </div>
        </div>}

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
