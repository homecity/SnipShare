import { NextResponse } from 'next/server';
import { isAdminAuthenticated, getAdminPassword } from '@/lib/admin-auth';
import { cleanupExpiredSnippets, getExpiredFileKeys } from '@/lib/db';
import { getD1Db, getR2Bucket } from '@/lib/d1';

export async function POST() {
  try {
    const adminPassword = await getAdminPassword();
    const isAuth = await isAdminAuthenticated(adminPassword);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getD1Db();

    // Get R2 keys for expired file snippets before marking as deleted
    const expiredKeys = await getExpiredFileKeys(db);

    // Mark expired snippets as deleted in D1
    const cleaned = await cleanupExpiredSnippets(db);

    // Delete expired files from R2
    let filesDeleted = 0;
    if (expiredKeys.length > 0) {
      try {
        const r2 = await getR2Bucket();
        for (const key of expiredKeys) {
          try {
            await r2.delete(key);
            filesDeleted++;
          } catch (e) {
            console.error(`Failed to delete R2 key ${key}:`, e);
          }
        }
      } catch (e) {
        console.error('Failed to get R2 bucket:', e);
      }
    }

    return NextResponse.json({
      success: true,
      snippetsCleaned: cleaned,
      filesDeleted,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
