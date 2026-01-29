'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface AdminShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Snippets', href: '/admin/snippets', icon: '📝' },
  { label: 'Security', href: '/admin/security', icon: '🛡️' },
  { label: 'Settings', href: '/admin/settings', icon: '⚙️' },
];

export default function AdminShell({ children }: AdminShellProps) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/auth-check')
      .then(r => r.json())
      .then((data) => setAuthenticated((data as { authenticated: boolean }).authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setAuthenticated(true);
      } else {
        const data = await res.json() as { error: string };
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
    router.push('/admin');
  };

  // Loading
  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Login form
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  snipit.sh
                </span>
              </h1>
            </Link>
            <p className="text-slate-400 mt-2">Admin Panel</p>
          </div>

          <form onSubmit={handleLogin} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn || !password}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {loggingIn ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin shell with sidebar
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white text-2xl">☰</button>
        <Link href="/" className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold text-lg">
          snipit.sh Admin
        </Link>
        <button onClick={handleLogout} className="text-slate-400 hover:text-white text-sm">Logout</button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block fixed lg:sticky top-0 left-0 z-40 w-64 h-screen bg-slate-800/90 lg:bg-slate-800/50 border-r border-slate-700 flex-shrink-0`}>
          <div className="p-6">
            <Link href="/" className="block mb-8">
              <h1 className="text-xl font-bold">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  snipit.sh
                </span>
              </h1>
              <p className="text-slate-500 text-sm">Admin Panel</p>
            </Link>

            <nav className="space-y-1">
              {NAV_ITEMS.map(item => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition text-sm ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 pt-8 border-t border-slate-700">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-300 transition text-sm w-full rounded-lg hover:bg-slate-700/50"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition text-sm rounded-lg hover:bg-slate-700/50 mt-1"
              >
                <span>🏠</span>
                <span>Back to Site</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
