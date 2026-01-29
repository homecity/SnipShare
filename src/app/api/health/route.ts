import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Simple health check endpoint for monitoring.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'snipshare',
    timestamp: new Date().toISOString(),
    version: '1.1.0',
  });
}
