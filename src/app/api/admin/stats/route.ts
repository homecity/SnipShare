import { NextResponse } from 'next/server';
import { isAdminAuthenticated, getAdminPassword } from '@/lib/admin-auth';
import { getD1Db } from '@/lib/d1';
import { snippets, rateLimits } from '@/lib/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const adminPassword = await getAdminPassword();
    const isAuth = await isAdminAuthenticated(adminPassword);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getD1Db();
    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400);
    const last24h = Date.now() - 24 * 60 * 60 * 1000;

    // Total snippets
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(snippets);
    const totalSnippets = totalResult[0]?.count || 0;

    // Active snippets (not deleted)
    const activeResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(snippets)
      .where(eq(snippets.is_deleted, false));
    const activeSnippets = activeResult[0]?.count || 0;

    // Today's snippets
    const todayResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(snippets)
      .where(gte(snippets.created_at, todayStart));
    const todaySnippets = todayResult[0]?.count || 0;

    // Rate limit blocks (entries in last 24h that hit limit)
    const rateLimitResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(rateLimits)
      .where(gte(rateLimits.timestamp, last24h));
    const rateLimitEntries = rateLimitResult[0]?.count || 0;

    // Encrypted snippets count
    const encryptedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(snippets)
      .where(and(eq(snippets.is_encrypted, true), eq(snippets.is_deleted, false)));
    const encryptedSnippets = encryptedResult[0]?.count || 0;

    // Burn after read count
    const burnResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(snippets)
      .where(and(eq(snippets.burn_after_read, true), eq(snippets.is_deleted, false)));
    const burnSnippets = burnResult[0]?.count || 0;

    return NextResponse.json({
      totalSnippets,
      activeSnippets,
      todaySnippets,
      deletedSnippets: totalSnippets - activeSnippets,
      encryptedSnippets,
      burnSnippets,
      rateLimitEntries,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
