'use client';

import { useEffect, useState, useCallback } from 'react';

interface EmbedViewProps {
  id: string;
  content: string;
  language: string;
  title: string | null;
  theme: string;
}

export default function EmbedView({ id, content, language, title, theme }: EmbedViewProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');

  const highlightCode = useCallback(async (code: string, lang: string) => {
    const hljs = (await import('highlight.js/lib/core')).default;

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

    if (lang !== 'plaintext' && langMap[lang]) {
      const langModule = await langMap[lang]();
      hljs.registerLanguage(lang, langModule.default as never);
      return hljs.highlight(code, { language: lang }).value;
    }

    const commonLangs = ['javascript', 'python', 'json', 'bash', 'html', 'css'];
    for (const l of commonLangs) {
      if (langMap[l]) {
        const mod = await langMap[l]();
        hljs.registerLanguage(l, mod.default as never);
      }
    }
    return hljs.highlightAuto(code).value;
  }, []);

  useEffect(() => {
    highlightCode(content, language).then(setHighlightedHtml);
    if (!document.querySelector('link[data-hljs-theme]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = theme === 'light'
        ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css'
        : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css';
      link.setAttribute('data-hljs-theme', 'true');
      document.head.appendChild(link);
    }
  }, [content, language, theme, highlightCode]);

  const isDark = theme === 'dark';
  const lines = content.split('\n');
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://snipit.sh';

  return (
    <div className={`min-h-screen font-mono text-sm ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
      {/* Header bar */}
      <div className={`flex items-center justify-between px-4 py-2 text-xs ${isDark ? 'bg-slate-800 text-slate-400 border-b border-slate-700' : 'bg-slate-100 text-slate-500 border-b border-slate-200'}`}>
        <div className="flex items-center gap-3">
          {title && <span className="font-semibold">{title}</span>}
          <span className={`px-2 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>{language}</span>
          <span>{lines.length} lines</span>
        </div>
        <a
          href={`${origin}/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`hover:underline ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
        >
          snipit.sh
        </a>
      </div>

      {/* Code with line numbers */}
      <div className="flex overflow-auto">
        <div className={`select-none text-right pr-3 pl-3 py-3 shrink-0 ${isDark ? 'text-slate-600 border-r border-slate-700' : 'text-slate-400 border-r border-slate-200'}`}>
          {lines.map((_, i) => (
            <div key={i} className="leading-relaxed">{i + 1}</div>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          <pre className="p-3 leading-relaxed">
            <code
              className={`hljs language-${language}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml || content }}
            />
          </pre>
        </div>
      </div>
    </div>
  );
}
