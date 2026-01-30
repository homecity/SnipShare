import { NextRequest, NextResponse } from 'next/server';
import {
  getSnippetById,
  incrementViewCount,
  markAsDeleted,
  verifyPassword,
} from '@/lib/db';
import { decryptContent, decryptWithKey, base64ToArrayBuffer } from '@/lib/encryption';
import { getD1Db } from '@/lib/d1';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getD1Db();
    const { id } = await params;
    const snippet = await getSnippetById(db, id);

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
    await incrementViewCount(db, id);
    const newViewCount = snippet.view_count + 1;

    // Burn after read: allow 2 views (creator + recipient), then delete
    if (snippet.burn_after_read && newViewCount >= 2) {
      await markAsDeleted(db, id);
    }

    // Decrypt server-side encryption if encryption_key exists
    let content = snippet.content;
    if (snippet.encryption_key) {
      try {
        const encryptedBuffer = base64ToArrayBuffer(content);
        const decryptedBuffer = await decryptWithKey(encryptedBuffer, snippet.encryption_key);
        content = new TextDecoder().decode(decryptedBuffer);
      } catch (e) {
        console.error('Failed to decrypt content with encryption key:', e);
        return NextResponse.json(
          { error: 'Failed to decrypt content' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      id: snippet.id,
      content,
      language: snippet.language,
      title: snippet.title,
      viewCount: newViewCount,
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
    const db = await getD1Db();
    const { id } = await params;
    const body = await request.json() as { password: string };
    const { password } = body;

    const snippet = await getSnippetById(db, id);

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
    const isValid = await verifyPassword(snippet, password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 401 }
      );
    }

    // Decrypt password encryption first
    const decryptedContent = await decryptContent(snippet.content, password);
    if (!decryptedContent) {
      return NextResponse.json(
        { error: 'Failed to decrypt content' },
        { status: 500 }
      );
    }

    // Then decrypt server-side encryption if encryption_key exists
    let finalContent = decryptedContent;
    if (snippet.encryption_key) {
      try {
        const encryptedBuffer = base64ToArrayBuffer(decryptedContent);
        const decryptedBuffer = await decryptWithKey(encryptedBuffer, snippet.encryption_key);
        finalContent = new TextDecoder().decode(decryptedBuffer);
      } catch (e) {
        console.error('Failed to decrypt content with encryption key:', e);
        return NextResponse.json(
          { error: 'Failed to decrypt content' },
          { status: 500 }
        );
      }
    }

    // Increment view count
    await incrementViewCount(db, id);
    const newViewCount = snippet.view_count + 1;

    // Burn after read: allow 2 views (creator + recipient), then delete
    if (snippet.burn_after_read && newViewCount >= 2) {
      await markAsDeleted(db, id);
    }

    return NextResponse.json({
      id: snippet.id,
      content: finalContent,
      language: snippet.language,
      title: snippet.title,
      viewCount: newViewCount,
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
