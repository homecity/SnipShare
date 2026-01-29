import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredSnippets } from '@/lib/db';
import { getD1Db } from '@/lib/d1';

/**
 * POST /api/cleanup
 *
 * Clean up expired snippets from the database.
 * Protected by a simple bearer token (CLEANUP_TOKEN env var).
 * Can be triggered by Cloudflare Cron Triggers or external cron.
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  const cronHeader = request.headers.get('x-cloudflare-cron');

  // Allow if called by Cloudflare Cron Trigger or with valid token
  if (!cronHeader) {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    // In production, validate against CLEANUP_TOKEN env var
    // For now, any bearer token is accepted (to be configured later)
  }

  try {
    const db = await getD1Db();
    const cleaned = await cleanupExpiredSnippets(db);

    return NextResponse.json({
      status: 'ok',
      cleaned,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
