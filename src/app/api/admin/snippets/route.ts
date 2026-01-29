import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, getAdminPassword } from '@/lib/admin-auth';
import { getD1Db } from '@/lib/d1';
import { snippets } from '@/lib/schema';
import { desc, like, or, sql, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const adminPassword = await getAdminPassword();
    const isAuth = await isAdminAuthenticated(adminPassword);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getD1Db();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    let query = db.select().from(snippets);

    if (search) {
      query = query.where(
        or(
          like(snippets.id, `%${search}%`),
          like(snippets.title, `%${search}%`)
        )
      ) as typeof query;
    }

    const results = await query
      .orderBy(desc(snippets.created_at))
      .limit(limit)
      .offset(offset);

    // Get total count
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(snippets);
    if (search) {
      countQuery = countQuery.where(
        or(
          like(snippets.id, `%${search}%`),
          like(snippets.title, `%${search}%`)
        )
      ) as typeof countQuery;
    }
    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;

    return NextResponse.json({
      snippets: results.map(s => ({
        id: s.id,
        title: s.title,
        language: s.language,
        createdAt: s.created_at,
        expiresAt: s.expires_at,
        viewCount: s.view_count,
        isEncrypted: s.is_encrypted,
        burnAfterRead: s.burn_after_read,
        isDeleted: s.is_deleted,
        type: s.type || 'text',
        fileName: s.file_name,
        fileSize: s.file_size,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin snippets error:', error);
    return NextResponse.json({ error: 'Failed to fetch snippets' }, { status: 500 });
  }
}

// Delete a snippet
export async function DELETE(request: NextRequest) {
  try {
    const adminPassword = await getAdminPassword();
    const isAuth = await isAdminAuthenticated(adminPassword);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json() as { id: string };
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const db = await getD1Db();

    // If it's a file snippet, also delete from R2
    const results = await db.select().from(snippets).where(eq(snippets.id, id));
    const snippet = results[0];
    if (snippet?.type === 'file' && snippet.r2_key) {
      try {
        const { getR2Bucket } = await import('@/lib/d1');
        const r2 = await getR2Bucket();
        await r2.delete(snippet.r2_key);
      } catch (e) {
        console.error('Failed to delete from R2:', e);
      }
    }

    await db.update(snippets).set({ is_deleted: true }).where(eq(snippets.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete error:', error);
    return NextResponse.json({ error: 'Failed to delete snippet' }, { status: 500 });
  }
}
