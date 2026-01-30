import { NextRequest, NextResponse } from 'next/server';
import { getSnippetById, incrementViewCount, markAsDeleted } from '@/lib/db';
import { getD1Db } from '@/lib/d1';

/**
 * GET /api/snippets/[id]/raw
 *
 * Returns the raw content of a snippet as plain text.
 * Useful for curl, wget, and programmatic access.
 *
 * Password-protected snippets cannot be accessed via raw endpoint.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getD1Db();
    const { id } = await params;
    const snippet = await getSnippetById(db, id);

    if (!snippet) {
      return new NextResponse('Snippet not found or has expired.\n', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (snippet.is_encrypted) {
      return new NextResponse(
        'This snippet is password protected. Use the web interface to view it.\n',
        {
          status: 403,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }
      );
    }

    // Increment view count
    await incrementViewCount(db, id);
    const newViewCount = snippet.view_count + 1;

    // Burn after read: allow 2 views (creator + recipient), then delete
    if (snippet.burn_after_read && newViewCount >= 2) {
      await markAsDeleted(db, id);
    }

    // Return raw content with appropriate headers
    const contentType = getContentType(snippet.language);

    return new NextResponse(snippet.content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'X-Snippet-Language': snippet.language,
        'X-Snippet-Title': snippet.title || 'Untitled',
        'X-Snippet-Views': String(newViewCount),
        'Cache-Control': snippet.burn_after_read
          ? 'no-store'
          : 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('Error fetching raw snippet:', error);
    return new NextResponse('Internal server error.\n', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

function getContentType(language: string): string {
  const typeMap: Record<string, string> = {
    javascript: 'application/javascript; charset=utf-8',
    typescript: 'application/typescript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    html: 'text/html; charset=utf-8',
    xml: 'application/xml; charset=utf-8',
    css: 'text/css; charset=utf-8',
    markdown: 'text/markdown; charset=utf-8',
    yaml: 'text/yaml; charset=utf-8',
    sql: 'application/sql; charset=utf-8',
  };

  return typeMap[language] || 'text/plain; charset=utf-8';
}
