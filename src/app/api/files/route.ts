import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createSnippet, checkRateLimit, getSettings } from '@/lib/db';
import { encryptBuffer } from '@/lib/encryption';
import { getD1Db, getR2Bucket } from '@/lib/d1';
import { blockedIps } from '@/lib/schema';
import { eq } from 'drizzle-orm';

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
    const cfg = await getSettings(db);

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

    // Rate limit: per minute
    const minuteAllowed = await checkRateLimit(db, ip, 'create', cfg.rate_limit_per_minute, 60000);
    if (!minuteAllowed) {
      return NextResponse.json(
        { error: `Too many requests. Max ${cfg.rate_limit_per_minute} per minute.` },
        { status: 429 }
      );
    }

    // Rate limit: per hour
    const hourAllowed = await checkRateLimit(db, ip, 'create_hour', cfg.rate_limit_per_hour, 60 * 60 * 1000);
    if (!hourAllowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Max ${cfg.rate_limit_per_hour} per hour.` },
        { status: 429 }
      );
    }

    // Rate limit: per day
    const dayAllowed = await checkRateLimit(db, ip, 'create_daily', cfg.rate_limit_per_day, 24 * 60 * 60 * 1000);
    if (!dayAllowed) {
      return NextResponse.json(
        { error: `Daily rate limit exceeded. Max ${cfg.rate_limit_per_day} per day.` },
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

    // Validate file size (dynamic from settings)
    const maxFileSize = cfg.max_file_size_mb * 1024 * 1024;
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Maximum ${cfg.max_file_size_mb}MB allowed.` },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Validate file extension (dynamic from settings)
    const allowedExtensions = new Set(
      cfg.allowed_file_types.split(',').map(s => s.trim().toLowerCase())
    );
    const ext = getFileExtension(file.name);
    if (!ext || !allowedExtensions.has(ext)) {
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
