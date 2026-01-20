import { NextRequest, NextResponse } from 'next/server';
import { getSnippetById, incrementViewCount, markAsDeleted, verifyPassword } from '@/lib/db';
import { decryptContent } from '@/lib/encryption';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const snippet = getSnippetById(id);

    if (!snippet) {
      return NextResponse.json(
        { error: 'Snippet not found or has expired' },
        { status: 404 }
      );
    }

    // If password protected, don't return content directly
    if (snippet.is_encrypted) {
      return NextResponse.json({
        id: snippet.id,
        requiresPassword: true,
        language: snippet.language,
        title: snippet.title,
        viewCount: snippet.view_count,
        createdAt: snippet.created_at,
        expiresAt: snippet.expires_at,
        burnAfterRead: snippet.burn_after_read,
      });
    }

    // Increment view count
    incrementViewCount(id);

    // Handle burn after read
    if (snippet.burn_after_read) {
      markAsDeleted(id);
    }

    return NextResponse.json({
      id: snippet.id,
      content: snippet.content,
      language: snippet.language,
      title: snippet.title,
      viewCount: snippet.view_count + 1,
      createdAt: snippet.created_at,
      expiresAt: snippet.expires_at,
      burnAfterRead: snippet.burn_after_read,
      requiresPassword: false,
    });
  } catch (error) {
    console.error('Error fetching snippet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snippet' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { password } = body;

    const snippet = getSnippetById(id);

    if (!snippet) {
      return NextResponse.json(
        { error: 'Snippet not found or has expired' },
        { status: 404 }
      );
    }

    if (!snippet.is_encrypted) {
      return NextResponse.json(
        { error: 'This snippet is not password protected' },
        { status: 400 }
      );
    }

    // Verify password
    if (!verifyPassword(snippet, password)) {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 401 }
      );
    }

    // Decrypt content
    const decryptedContent = decryptContent(snippet.content, password);
    if (!decryptedContent) {
      return NextResponse.json(
        { error: 'Failed to decrypt content' },
        { status: 500 }
      );
    }

    // Increment view count
    incrementViewCount(id);

    // Handle burn after read
    if (snippet.burn_after_read) {
      markAsDeleted(id);
    }

    return NextResponse.json({
      id: snippet.id,
      content: decryptedContent,
      language: snippet.language,
      title: snippet.title,
      viewCount: snippet.view_count + 1,
      createdAt: snippet.created_at,
      expiresAt: snippet.expires_at,
      burnAfterRead: snippet.burn_after_read,
    });
  } catch (error) {
    console.error('Error unlocking snippet:', error);
    return NextResponse.json(
      { error: 'Failed to unlock snippet' },
      { status: 500 }
    );
  }
}
