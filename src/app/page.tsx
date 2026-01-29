'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function Home() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState(EXPIRATION_OPTIONS[3].value); // Default 3 days
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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

      router.push(`/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              SnipShare
            </span>
          </h1>
          <p className="text-slate-400">Share text and code snippets securely</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <input
              type="text"
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              maxLength={100}
            />
          </div>

          {/* Content */}
          <div>
            <textarea
              placeholder="Paste your text or code here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-64 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition font-mono text-sm resize-y"
              required
            />
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Language */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Expiration */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Expires In</label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(Number(e.target.value))}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              >
                {EXPIRATION_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Password (optional)</label>
              <input
                type="password"
                placeholder="Set a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            {/* Burn After Read */}
            <div className="flex items-end">
              <label className="flex items-center space-x-3 cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={burnAfterRead}
                  onChange={(e) => setBurnAfterRead(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800/50 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-slate-300">Burn after reading</span>
              </label>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Snippet'}
          </button>
        </form>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-white font-semibold mb-2">Password Protection</h3>
            <p className="text-slate-400 text-sm">Encrypt your snippets with a password for secure sharing</p>
          </div>
          <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <div className="text-3xl mb-3">⏰</div>
            <h3 className="text-white font-semibold mb-2">Auto-Expiration</h3>
            <p className="text-slate-400 text-sm">Set snippets to expire automatically after a set time</p>
          </div>
          <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <div className="text-3xl mb-3">🔥</div>
            <h3 className="text-white font-semibold mb-2">Burn After Reading</h3>
            <p className="text-slate-400 text-sm">One-time view snippets that delete after being read</p>
          </div>
        </div>

        <footer className="mt-12 text-center text-slate-500 text-sm">
          <p>No login required. Your snippets are yours.</p>
        </footer>
      </div>
    </div>
  );
}
