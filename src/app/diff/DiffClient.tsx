'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface DiffLine {
  type: 'equal' | 'add' | 'remove' | 'modify';
  leftNum: number | null;
  rightNum: number | null;
  left: string;
  right: string;
}

function computeDiff(leftText: string, rightText: string): DiffLine[] {
  const leftLines = leftText.split('\n');
  const rightLines = rightText.split('\n');

  // Simple LCS-based diff
  const m = leftLines.length;
  const n = rightLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  const result: DiffLine[] = [];
  let i = m, j = n;

  const temp: DiffLine[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      temp.push({ type: 'equal', leftNum: i, rightNum: j, left: leftLines[i - 1], right: rightLines[j - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      temp.push({ type: 'add', leftNum: null, rightNum: j, left: '', right: rightLines[j - 1] });
      j--;
    } else if (i > 0) {
      temp.push({ type: 'remove', leftNum: i, rightNum: null, left: leftLines[i - 1], right: '' });
      i--;
    }
  }

  temp.reverse();

  // Merge adjacent remove+add into modify when they're paired
  for (let k = 0; k < temp.length; k++) {
    if (k + 1 < temp.length && temp[k].type === 'remove' && temp[k + 1].type === 'add') {
      result.push({
        type: 'modify',
        leftNum: temp[k].leftNum,
        rightNum: temp[k + 1].rightNum,
        left: temp[k].left,
        right: temp[k + 1].right,
      });
      k++; // skip next
    } else {
      result.push(temp[k]);
    }
  }

  return result;
}

function DiffStats({ diff }: { diff: DiffLine[] }) {
  const added = diff.filter(d => d.type === 'add').length;
  const removed = diff.filter(d => d.type === 'remove').length;
  const modified = diff.filter(d => d.type === 'modify').length;
  const unchanged = diff.filter(d => d.type === 'equal').length;

  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{unchanged} unchanged</span>
      {added > 0 && <span className="text-green-600 dark:text-green-400">+{added} added</span>}
      {removed > 0 && <span className="text-red-600 dark:text-red-400">-{removed} removed</span>}
      {modified > 0 && <span className="text-amber-600 dark:text-amber-400">~{modified} modified</span>}
    </div>
  );
}

export default function DiffClient() {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [leftLabel, setLeftLabel] = useState('Original');
  const [rightLabel, setRightLabel] = useState('Modified');
  const [showDiff, setShowDiff] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  const diff = useMemo(() => {
    if (!showDiff) return [];
    return computeDiff(leftText, rightText);
  }, [leftText, rightText, showDiff]);

  const handleCompare = () => {
    if (!leftText.trim() && !rightText.trim()) return;
    setShowDiff(true);
  };

  const handleReset = () => {
    setShowDiff(false);
    setLeftText('');
    setRightText('');
  };

  const handleSwap = () => {
    setLeftText(rightText);
    setRightText(leftText);
    setLeftLabel(rightLabel);
    setRightLabel(leftLabel);
    if (showDiff) setShowDiff(true); // re-trigger
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
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

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>

        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              Diff Tool
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Compare two texts or code snippets side by side</p>
        </header>

        {/* Input Area */}
        {!showDiff && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={leftLabel}
                    onChange={(e) => setLeftLabel(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Label"
                  />
                  <span className="text-red-500 dark:text-red-400 text-sm font-medium">Original</span>
                </div>
                <textarea
                  value={leftText}
                  onChange={(e) => setLeftText(e.target.value)}
                  placeholder="Paste the original text here..."
                  className="w-full h-80 px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm resize-y"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={rightLabel}
                    onChange={(e) => setRightLabel(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Label"
                  />
                  <span className="text-green-500 dark:text-green-400 text-sm font-medium">Modified</span>
                </div>
                <textarea
                  value={rightText}
                  onChange={(e) => setRightText(e.target.value)}
                  placeholder="Paste the modified text here..."
                  className="w-full h-80 px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm resize-y"
                />
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={handleSwap}
                className="px-6 py-3 bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition"
                title="Swap sides"
              >
                ⇄ Swap
              </button>
              <button
                onClick={handleCompare}
                disabled={!leftText.trim() && !rightText.trim()}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Compare
              </button>
            </div>
          </div>
        )}

        {/* Diff Result */}
        {showDiff && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <DiffStats diff={diff} />

              <div className="flex gap-2">
                <div className="inline-flex bg-slate-200/80 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('split')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                      viewMode === 'split'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Split
                  </button>
                  <button
                    onClick={() => setViewMode('unified')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                      viewMode === 'unified'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Unified
                  </button>
                </div>

                <button
                  onClick={() => setShowDiff(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition text-sm"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition text-sm"
                >
                  🗑️ Reset
                </button>
              </div>
            </div>

            {/* Diff View */}
            <div className="bg-white/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
              {viewMode === 'split' ? (
                <SplitView diff={diff} leftLabel={leftLabel} rightLabel={rightLabel} />
              ) : (
                <UnifiedView diff={diff} leftLabel={leftLabel} rightLabel={rightLabel} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SplitView({ diff, leftLabel, rightLabel }: { diff: DiffLine[]; leftLabel: string; rightLabel: string }) {
  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-700/50">
        <div className="px-4 py-2 bg-red-50/50 dark:bg-red-500/5 text-red-700 dark:text-red-400 text-sm font-medium border-r border-slate-200 dark:border-slate-700/50">
          {leftLabel}
        </div>
        <div className="px-4 py-2 bg-green-50/50 dark:bg-green-500/5 text-green-700 dark:text-green-400 text-sm font-medium">
          {rightLabel}
        </div>
      </div>

      {/* Lines */}
      <div className="overflow-auto max-h-[70vh]">
        {diff.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            Both texts are identical ✓
          </div>
        ) : (
          <table className="w-full font-mono text-sm">
            <tbody>
              {diff.map((line, idx) => (
                <tr key={idx} className={getRowClass(line.type)}>
                  {/* Left side */}
                  <td className="w-10 text-right px-2 py-0.5 text-slate-400 dark:text-slate-600 select-none border-r border-slate-200 dark:border-slate-700/50 text-xs">
                    {line.leftNum || ''}
                  </td>
                  <td className={`px-3 py-0.5 whitespace-pre-wrap break-all border-r border-slate-200 dark:border-slate-700/50 ${getLeftCellClass(line.type)}`}>
                    {line.type === 'add' ? '' : line.left}
                  </td>
                  {/* Right side */}
                  <td className="w-10 text-right px-2 py-0.5 text-slate-400 dark:text-slate-600 select-none border-r border-slate-200 dark:border-slate-700/50 text-xs">
                    {line.rightNum || ''}
                  </td>
                  <td className={`px-3 py-0.5 whitespace-pre-wrap break-all ${getRightCellClass(line.type)}`}>
                    {line.type === 'remove' ? '' : line.right}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function UnifiedView({ diff, leftLabel, rightLabel }: { diff: DiffLine[]; leftLabel: string; rightLabel: string }) {
  return (
    <div>
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50 text-sm text-slate-500 dark:text-slate-400">
        <span className="text-red-600 dark:text-red-400">--- {leftLabel}</span>
        {' / '}
        <span className="text-green-600 dark:text-green-400">+++ {rightLabel}</span>
      </div>

      <div className="overflow-auto max-h-[70vh]">
        {diff.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            Both texts are identical ✓
          </div>
        ) : (
          <table className="w-full font-mono text-sm">
            <tbody>
              {diff.map((line, idx) => {
                if (line.type === 'equal') {
                  return (
                    <tr key={idx}>
                      <td className="w-10 text-right px-2 py-0.5 text-slate-400 dark:text-slate-600 select-none text-xs">{line.leftNum}</td>
                      <td className="w-10 text-right px-2 py-0.5 text-slate-400 dark:text-slate-600 select-none border-r border-slate-200 dark:border-slate-700/50 text-xs">{line.rightNum}</td>
                      <td className="w-6 text-center text-slate-400 dark:text-slate-600 select-none"> </td>
                      <td className="px-3 py-0.5 whitespace-pre-wrap break-all text-slate-900 dark:text-slate-100">{line.left}</td>
                    </tr>
                  );
                }

                if (line.type === 'modify') {
                  return (
                    <>
                      <tr key={`${idx}-r`} className="bg-red-50/80 dark:bg-red-500/10">
                        <td className="w-10 text-right px-2 py-0.5 text-red-400 dark:text-red-600 select-none text-xs">{line.leftNum}</td>
                        <td className="w-10 text-right px-2 py-0.5 text-slate-400 dark:text-slate-600 select-none border-r border-slate-200 dark:border-slate-700/50 text-xs"></td>
                        <td className="w-6 text-center text-red-500 dark:text-red-400 select-none font-bold">-</td>
                        <td className="px-3 py-0.5 whitespace-pre-wrap break-all text-red-800 dark:text-red-200">{line.left}</td>
                      </tr>
                      <tr key={`${idx}-a`} className="bg-green-50/80 dark:bg-green-500/10">
                        <td className="w-10 text-right px-2 py-0.5 text-slate-400 dark:text-slate-600 select-none text-xs"></td>
                        <td className="w-10 text-right px-2 py-0.5 text-green-400 dark:text-green-600 select-none border-r border-slate-200 dark:border-slate-700/50 text-xs">{line.rightNum}</td>
                        <td className="w-6 text-center text-green-500 dark:text-green-400 select-none font-bold">+</td>
                        <td className="px-3 py-0.5 whitespace-pre-wrap break-all text-green-800 dark:text-green-200">{line.right}</td>
                      </tr>
                    </>
                  );
                }

                if (line.type === 'remove') {
                  return (
                    <tr key={idx} className="bg-red-50/80 dark:bg-red-500/10">
                      <td className="w-10 text-right px-2 py-0.5 text-red-400 dark:text-red-600 select-none text-xs">{line.leftNum}</td>
                      <td className="w-10 text-right px-2 py-0.5 text-slate-400 dark:text-slate-600 select-none border-r border-slate-200 dark:border-slate-700/50 text-xs"></td>
                      <td className="w-6 text-center text-red-500 dark:text-red-400 select-none font-bold">-</td>
                      <td className="px-3 py-0.5 whitespace-pre-wrap break-all text-red-800 dark:text-red-200">{line.left}</td>
                    </tr>
                  );
                }

                // add
                return (
                  <tr key={idx} className="bg-green-50/80 dark:bg-green-500/10">
                    <td className="w-10 text-right px-2 py-0.5 text-slate-400 dark:text-slate-600 select-none text-xs"></td>
                    <td className="w-10 text-right px-2 py-0.5 text-green-400 dark:text-green-600 select-none border-r border-slate-200 dark:border-slate-700/50 text-xs">{line.rightNum}</td>
                    <td className="w-6 text-center text-green-500 dark:text-green-400 select-none font-bold">+</td>
                    <td className="px-3 py-0.5 whitespace-pre-wrap break-all text-green-800 dark:text-green-200">{line.right}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function getRowClass(type: string): string {
  switch (type) {
    case 'add': return 'bg-green-50/80 dark:bg-green-500/10';
    case 'remove': return 'bg-red-50/80 dark:bg-red-500/10';
    case 'modify': return 'bg-amber-50/80 dark:bg-amber-500/10';
    default: return '';
  }
}

function getLeftCellClass(type: string): string {
  switch (type) {
    case 'remove': return 'text-red-800 dark:text-red-200';
    case 'modify': return 'text-red-800 dark:text-red-200';
    default: return 'text-slate-900 dark:text-slate-100';
  }
}

function getRightCellClass(type: string): string {
  switch (type) {
    case 'add': return 'text-green-800 dark:text-green-200';
    case 'modify': return 'text-green-800 dark:text-green-200';
    default: return 'text-slate-900 dark:text-slate-100';
  }
}
