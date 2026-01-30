import { NextRequest, NextResponse } from 'next/server';
import {
  getSnippetById,
  incrementViewCount,
  markAsDeleted,
  verifyPassword,
} from '@/lib/db';
import { decryptBuffer, decryptWithKey } from '@/lib/encryption';
import { getD1Db, getR2Bucket } from '@/lib/d1';
import { isAdminAuthenticated, getAdminPassword } from '@/lib/admin-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getD1Db();
    const r2 = await getR2Bucket();
    const { id } = await params;

    const snippet = await getSnippetById(db, id);
    if (!snippet || snippet.type !== 'file') {
      return NextResponse.json(
        { error: 'File not found or has expired' },
        { status: 404 }
      );
    }

    // Check password if encrypted
    if (snippet.is_encrypted) {
      const password =
        request.nextUrl.searchParams.get('password') ||
        request.headers.get('x-password') ||
        '';

      if (!password) {
        return NextResponse.json(
          {
            error: 'Password required',
            requiresPassword: true,
            id: snippet.id,
            fileName: snippet.file_name,
            fileSize: snippet.file_size,
            fileType: snippet.file_type,
            burnAfterRead: snippet.burn_after_read,
          },
          { status: 401 }
        );
      }

      const isValid = await verifyPassword(snippet, password);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Incorrect password' },
          { status: 401 }
        );
      }

      // Get file from R2 and decrypt
      const r2Object = await r2.get(snippet.r2_key!);
      if (!r2Object) {
        return NextResponse.json(
          { error: 'File data not found' },
          { status: 404 }
        );
      }

      let fileData = await r2Object.arrayBuffer();

      // Step 1: Remove password encryption layer first
      const decryptedByPassword = await decryptBuffer(fileData, password);
      if (!decryptedByPassword) {
        return NextResponse.json(
          { error: 'Failed to decrypt file' },
          { status: 500 }
        );
      }
      fileData = decryptedByPassword;

      // Step 2: Remove server-side encryption layer
      if (snippet.encryption_key) {
        fileData = await decryptWithKey(fileData, snippet.encryption_key);
      }

      await incrementViewCount(db, id);
      const pwNewViewCount = snippet.view_count + 1;

      // Burn after read: allow 2 views (creator + recipient), then delete
      if (snippet.burn_after_read && pwNewViewCount >= 2) {
        await markAsDeleted(db, id);
        await r2.delete(snippet.r2_key!);
      }

      return new NextResponse(fileData, {
        headers: {
          'Content-Type': snippet.file_type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(snippet.file_name || 'download')}"`,
          'Content-Length': String(fileData.byteLength),
        },
      });
    }

    // Non-password-protected file
    const r2Object = await r2.get(snippet.r2_key!);
    if (!r2Object) {
      return NextResponse.json(
        { error: 'File data not found' },
        { status: 404 }
      );
    }

    let data = await r2Object.arrayBuffer();

    // Decrypt server-side encryption if key exists (backward compatible)
    if (snippet.encryption_key) {
      data = await decryptWithKey(data, snippet.encryption_key);
    }

    await incrementViewCount(db, id);
    const newViewCount = snippet.view_count + 1;

    // Burn after read: allow 2 views (creator + recipient), then delete
    if (snippet.burn_after_read && newViewCount >= 2) {
      await markAsDeleted(db, id);
      await r2.delete(snippet.r2_key!);
    }

    return new NextResponse(data, {
      headers: {
        'Content-Type': snippet.file_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(snippet.file_name || 'download')}"`,
        'Content-Length': String(data.byteLength),
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}

// DELETE - admin only
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminPassword = await getAdminPassword();
    const isAuth = await isAdminAuthenticated(adminPassword);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getD1Db();
    const r2 = await getR2Bucket();
    const { id } = await params;

    const snippet = await getSnippetById(db, id);
    if (!snippet) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Delete from R2 if it's a file
    if (snippet.type === 'file' && snippet.r2_key) {
      await r2.delete(snippet.r2_key);
    }

    await markAsDeleted(db, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
