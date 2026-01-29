import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createSnippet, checkRateLimit } from '@/lib/db';
import { encryptBuffer, hashPassword } from '@/lib/encryption';
import { getD1Db, getR2Bucket } from '@/lib/d1';
import { blockedIps } from '@/lib/schema';
import { eq } from 'drizzle-orm';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_EXTENSIONS = new Set([
  '.txt', '.md', '.pdf', '.json', '.csv', '.log', '.xml', '.yaml', '.yml',
  '.html', '.css', '.js', '.ts', '.py', '.sh', '.sql',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.zip',
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.log': 'text/plain',
  '.xml': 'application/xml',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
  '.py': 'text/x-python',
  '.sh': 'application/x-sh',
  '.sql': 'application/sql',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.zip': 'application/zip',
};

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot).toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const db = await getD1Db();
    const r2 = await getR2Bucket();

    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      'unknown';

    // Check if IP is blocked
    try {
      const blocked = await db.select().from(blockedIps).where(eq(blockedIps.ip, ip));
      if (blocked.length > 0) {
        return NextResponse.json(
          { error: 'Your IP has been blocked. Contact the administrator.' },
          { status: 403 }
        );
      }
    } catch {
      // blocked_ips table might not exist yet
    }

    // Rate limit: 20/hour (shared with text snippets via 'create' action)
    const hourAllowed = await checkRateLimit(db, ip, 'create', 20, 60 * 60 * 1000);
    if (!hourAllowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 20 uploads per hour.' },
        { status: 429 }
      );
    }

    // Daily rate limit: 100/day
    const dayAllowed = await checkRateLimit(db, ip, 'create_daily', 100, 24 * 60 * 60 * 1000);
    if (!dayAllowed) {
      return NextResponse.json(
        { error: 'Daily rate limit exceeded. Max 100 uploads per day.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const password = formData.get('password') as string | null;
    const expiresInStr = formData.get('expiresIn') as string | null;
    const burnAfterReadStr = formData.get('burnAfterRead') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum 5MB allowed.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Validate file extension
    const ext = getFileExtension(file.name);
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `File type "${ext || 'unknown'}" is not allowed.` },
        { status: 400 }
      );
    }

    const expiresIn = expiresInStr ? parseInt(expiresInStr, 10) : undefined;
    const burnAfterRead = burnAfterReadStr === 'true';

    // Validate expiration (max 2 weeks)
    const maxExpiration = 14 * 24 * 60 * 60 * 1000;
    if (expiresIn && expiresIn > maxExpiration) {
      return NextResponse.json(
        { error: 'Maximum expiration is 2 weeks' },
        { status: 400 }
      );
    }

    const id = nanoid(10);
    const r2Key = `files/${id}/${file.name}`;
    const mimeType = EXTENSION_TO_MIME[ext] || file.type || 'application/octet-stream';

    // Read file data
    let fileData: ArrayBuffer = await file.arrayBuffer();

    // Encrypt if password provided
    if (password) {
      fileData = await encryptBuffer(fileData, password);
    }

    // Upload to R2
    await r2.put(r2Key, fileData, {
      httpMetadata: {
        contentType: password ? 'application/octet-stream' : mimeType,
      },
      customMetadata: {
        originalName: file.name,
        originalType: mimeType,
        encrypted: password ? 'true' : 'false',
      },
    });

    // Create snippet record in D1
    const snippet = await createSnippet(db, {
      id,
      content: '', // No text content for files
      language: 'plaintext',
      title: file.name,
      password: password || undefined,
      expiresIn,
      burnAfterRead,
      type: 'file',
      fileName: file.name,
      fileSize: file.size,
      fileType: mimeType,
      r2Key,
    });

    return NextResponse.json({
      id: snippet.id,
      url: `/${snippet.id}`,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
