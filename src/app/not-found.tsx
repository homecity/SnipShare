import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl text-white mb-2">Snippet Not Found</h1>
        <p className="text-slate-400 mb-6">
          This snippet doesn&apos;t exist, has expired, or was burned after reading.
        </p>
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
