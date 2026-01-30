'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface Endpoint {
  method: string;
  path: string;
  description: string;
  body?: Record<string, { type: string; required?: boolean; description: string }>;
  params?: Record<string, { type: string; description: string }>;
  response: string;
  example: {
    request: string;
    response: string;
  };
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'POST',
    path: '/api/snippets',
    description: 'Create a new text snippet. Content is AES-256 encrypted at rest.',
    body: {
      content: { type: 'string', required: true, description: 'The text/code content (max 500KB)' },
      language: { type: 'string', description: 'Syntax highlighting language (default: "plaintext")' },
      title: { type: 'string', description: 'Optional title for the snippet' },
      password: { type: 'string', description: 'Optional password for additional encryption' },
      expiresIn: { type: 'number', description: 'Expiration time in milliseconds (max: 2 weeks)' },
      burnAfterRead: { type: 'boolean', description: 'Delete after first view (default: false)' },
    },
    response: '{ "id": "abc123", "url": "/abc123" }',
    example: {
      request: `curl -X POST https://snipit.sh/api/snippets \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "console.log(\\"Hello World\\");",
    "language": "javascript",
    "title": "Hello World",
    "expiresIn": 86400000
  }'`,
      response: `{
  "id": "a1b2c3d4e5",
  "url": "/a1b2c3d4e5"
}`,
    },
  },
  {
    method: 'GET',
    path: '/api/snippets/:id',
    description: 'Retrieve a snippet by ID. Increments view count. If password-protected, returns metadata only.',
    response: '{ "id", "content", "language", "title", "viewCount", "createdAt", "expiresAt", "burnAfterRead" }',
    example: {
      request: 'curl https://snipit.sh/api/snippets/a1b2c3d4e5',
      response: `{
  "id": "a1b2c3d4e5",
  "content": "console.log(\\"Hello World\\");",
  "language": "javascript",
  "title": "Hello World",
  "viewCount": 3,
  "createdAt": 1738278400,
  "expiresAt": 1738364800,
  "burnAfterRead": false,
  "requiresPassword": false
}`,
    },
  },
  {
    method: 'POST',
    path: '/api/snippets/:id',
    description: 'Unlock a password-protected snippet by providing the password.',
    body: {
      password: { type: 'string', required: true, description: 'The snippet password' },
    },
    response: '{ "id", "content", "language", "title", "viewCount", ... }',
    example: {
      request: `curl -X POST https://snipit.sh/api/snippets/a1b2c3d4e5 \\
  -H "Content-Type: application/json" \\
  -d '{ "password": "secret123" }'`,
      response: `{
  "id": "a1b2c3d4e5",
  "content": "decrypted content...",
  "language": "javascript",
  "title": "Secret Snippet",
  "viewCount": 1,
  ...
}`,
    },
  },
  {
    method: 'GET',
    path: '/api/snippets/:id/raw',
    description: 'Get raw content with appropriate Content-Type header. Ideal for curl/wget. Does not work with encrypted snippets.',
    response: 'Raw text content with language-appropriate Content-Type',
    example: {
      request: 'curl https://snipit.sh/api/snippets/a1b2c3d4e5/raw',
      response: 'console.log("Hello World");',
    },
  },
  {
    method: 'POST',
    path: '/api/files',
    description: 'Upload a file as a snippet. Files are encrypted and stored in Cloudflare R2.',
    body: {
      file: { type: 'File', required: true, description: 'The file to upload (multipart/form-data)' },
      password: { type: 'string', description: 'Optional password protection' },
      expiresIn: { type: 'string', description: 'Expiration in milliseconds' },
      burnAfterRead: { type: 'string', description: '"true" or "false"' },
    },
    response: '{ "id": "abc123", "url": "/abc123" }',
    example: {
      request: `curl -X POST https://snipit.sh/api/files \\
  -F "file=@document.pdf" \\
  -F "expiresIn=86400000"`,
      response: `{
  "id": "f1g2h3i4j5",
  "url": "/f1g2h3i4j5"
}`,
    },
  },
  {
    method: 'GET',
    path: '/api/files/:id',
    description: 'Download a file snippet. Returns the decrypted file with proper Content-Type.',
    params: {
      password: { type: 'string', description: 'Required for password-protected files (query param)' },
    },
    response: 'Binary file with Content-Disposition: attachment header',
    example: {
      request: 'curl -O https://snipit.sh/api/files/f1g2h3i4j5',
      response: '(binary file data)',
    },
  },
  {
    method: 'GET',
    path: '/api/health',
    description: 'Health check endpoint for monitoring. Returns service status and database connectivity.',
    response: '{ "status": "ok", "timestamp": "...", "database": "connected" }',
    example: {
      request: 'curl https://snipit.sh/api/health',
      response: `{
  "status": "ok",
  "timestamp": "2026-01-30T12:00:00.000Z",
  "database": "connected"
}`,
    },
  },
  {
    method: 'POST',
    path: '/api/cleanup',
    description: 'Trigger cleanup of expired snippets and associated R2 files. Useful for cron jobs.',
    response: '{ "cleaned": 5, "r2Deleted": 2 }',
    example: {
      request: 'curl -X POST https://snipit.sh/api/cleanup',
      response: `{
  "cleaned": 5,
  "r2Deleted": 2
}`,
    },
  },
];

const LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'html', 'css', 'scss',
  'json', 'yaml', 'xml', 'markdown', 'sql', 'bash', 'powershell', 'dockerfile',
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
};

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedExample, setCopiedExample] = useState(false);

  const copyExample = async () => {
    try {
      await navigator.clipboard.writeText(endpoint.example.request);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = endpoint.example.request;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 2000);
  };

  return (
    <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
      >
        <span className={`px-3 py-1 rounded-md text-xs font-bold ${METHOD_COLORS[endpoint.method] || ''}`}>
          {endpoint.method}
        </span>
        <code className="text-slate-900 dark:text-white font-mono text-sm flex-1">
          {endpoint.path}
        </code>
        <span className="text-slate-500 dark:text-slate-400 text-sm hidden md:block">
          {endpoint.description.slice(0, 60)}…
        </span>
        <span className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="px-6 pb-6 border-t border-slate-200 dark:border-slate-700/50">
          <p className="mt-4 text-slate-600 dark:text-slate-300 text-sm">
            {endpoint.description}
          </p>

          {endpoint.body && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Request Body
              </h4>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left px-4 py-2 text-slate-500 dark:text-slate-400 font-medium">Field</th>
                      <th className="text-left px-4 py-2 text-slate-500 dark:text-slate-400 font-medium">Type</th>
                      <th className="text-left px-4 py-2 text-slate-500 dark:text-slate-400 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(endpoint.body).map(([key, val]) => (
                      <tr key={key} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <td className="px-4 py-2">
                          <code className="text-purple-600 dark:text-purple-400">{key}</code>
                          {val.required && <span className="text-red-500 ml-1">*</span>}
                        </td>
                        <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{val.type}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{val.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {endpoint.params && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Query Parameters
              </h4>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left px-4 py-2 text-slate-500 dark:text-slate-400 font-medium">Param</th>
                      <th className="text-left px-4 py-2 text-slate-500 dark:text-slate-400 font-medium">Type</th>
                      <th className="text-left px-4 py-2 text-slate-500 dark:text-slate-400 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(endpoint.params).map(([key, val]) => (
                      <tr key={key} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <td className="px-4 py-2">
                          <code className="text-purple-600 dark:text-purple-400">{key}</code>
                        </td>
                        <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{val.type}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{val.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Example</h4>
              <button
                onClick={copyExample}
                className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-500/30 transition"
              >
                {copiedExample ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 bg-slate-900 dark:bg-slate-950 rounded-lg text-sm text-emerald-400 overflow-auto font-mono">
              <code>{endpoint.example.request}</code>
            </pre>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-1">Response:</p>
            <pre className="p-4 bg-slate-100 dark:bg-slate-900/80 rounded-lg text-sm text-slate-700 dark:text-slate-300 overflow-auto font-mono">
              <code>{endpoint.example.response}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-2"
          >
            <span>←</span>
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent font-bold">
              snipit.sh
            </span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              API Documentation
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Create and retrieve snippets programmatically. All endpoints are available at{' '}
            <code className="text-purple-500 dark:text-purple-400">https://snipit.sh</code>.
            No authentication required.
          </p>
        </div>

        {/* Quick Start */}
        <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 mb-8 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">⚡ Quick Start</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Create a snippet:</p>
              <pre className="p-3 bg-slate-900 dark:bg-slate-950 rounded-lg text-sm text-emerald-400 overflow-auto font-mono">
{`curl -X POST https://snipit.sh/api/snippets \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Hello, World!", "language": "plaintext"}'`}
              </pre>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Read it back (raw):</p>
              <pre className="p-3 bg-slate-900 dark:bg-slate-950 rounded-lg text-sm text-emerald-400 overflow-auto font-mono">
{`curl https://snipit.sh/api/snippets/<id>/raw`}
              </pre>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Upload a file:</p>
              <pre className="p-3 bg-slate-900 dark:bg-slate-950 rounded-lg text-sm text-emerald-400 overflow-auto font-mono">
{`curl -X POST https://snipit.sh/api/files -F "file=@script.sh"`}
              </pre>
            </div>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">⚠️ Rate Limits</h2>
          <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
            <li>• <strong>10 requests/minute</strong> per IP (creation)</li>
            <li>• <strong>20 requests/hour</strong> per IP (creation)</li>
            <li>• <strong>100 requests/day</strong> per IP (creation)</li>
            <li>• Maximum content size: <strong>500KB</strong> (text), <strong>5MB</strong> (files)</li>
            <li>• Maximum expiration: <strong>2 weeks</strong></li>
          </ul>
        </div>

        {/* Endpoints */}
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Endpoints</h2>
        <div className="space-y-4 mb-12">
          {ENDPOINTS.map((ep, i) => (
            <EndpointCard key={i} endpoint={ep} />
          ))}
        </div>

        {/* Supported Languages */}
        <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 mb-8 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">🎨 Supported Languages</h2>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <span key={lang} className="px-3 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-md text-sm">
                {lang}
              </span>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 mb-3">🛡️ Security</h2>
          <ul className="text-sm text-emerald-700 dark:text-emerald-400 space-y-2">
            <li>• <strong>AES-256-GCM encryption at rest</strong> — all snippets are encrypted with a unique server-side key before storage</li>
            <li>• <strong>Optional password encryption</strong> — adds a second layer of client-supplied password encryption (PBKDF2 + AES-256)</li>
            <li>• <strong>Burn after reading</strong> — content is permanently deleted after first view</li>
            <li>• <strong>Auto-expiration</strong> — expired snippets are automatically cleaned up</li>
            <li>• <strong>No tracking</strong> — no analytics, no cookies (except admin), no third-party scripts</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/25 transition"
          >
            Try it out →
          </Link>
          <p className="mt-4 text-slate-500 dark:text-slate-500 text-sm">
            Open source on{' '}
            <a
              href="https://github.com/homecity/SnipShare"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-500 hover:text-purple-600 dark:text-purple-400 hover:underline"
            >
              GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
