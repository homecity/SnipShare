import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createSnippet, checkRateLimit, getSettings } from '@/lib/db';
import { encryptContent, generateEncryptionKey, encryptWithKey, arrayBufferToBase64 } from '@/lib/encryption';
import { getD1Db } from '@/lib/d1';
import { blockedIps } from '@/lib/schema';
import { eq } from 'drizzle-orm';


export async function POST(request: NextRequest) {
  try {
    const db = await getD1Db();
    const cfg = await getSettings(db);

    const ip = request.headers.get('cf-connecting-ip') ||
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
      // blocked_ips table might not exist yet, ignore
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

    const body = await request.json() as {
      content?: string;
      language?: string;
      title?: string;
      password?: string;
      expiresIn?: number;
      burnAfterRead?: boolean;
    };
    const { content, language, title, password, expiresIn, burnAfterRead } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > 500000) {
      return NextResponse.json(
        { error: 'Content too large. Maximum 500KB allowed.' },
        { status: 400 }
      );
    }

    // Validate expiration (max 2 weeks)
    const maxExpiration = 14 * 24 * 60 * 60 * 1000;
    if (expiresIn && expiresIn > maxExpiration) {
      return NextResponse.json(
        { error: 'Maximum expiration is 2 weeks' },
        { status: 400 }
      );
    }

    const id = nanoid(10);

    // Server-side encryption: always encrypt content with a random AES-256 key
    const encryptionKey = await generateEncryptionKey();
    const contentBuffer = new TextEncoder().encode(content);
    const encryptedBuffer = await encryptWithKey(contentBuffer.buffer as ArrayBuffer, encryptionKey);
    const encryptedBase64 = arrayBufferToBase64(encryptedBuffer);

    // If password provided, additionally encrypt with password (double encryption)
    const finalContent = password ? await encryptContent(encryptedBase64, password) : encryptedBase64;

    const snippet = await createSnippet(db, {
      id,
      content: finalContent,
      language: language || 'plaintext',
      title,
      password,
      expiresIn,
      burnAfterRead: burnAfterRead || false,
      encryptionKey,
    });

    return NextResponse.json({
      id: snippet.id,
      url: `/${snippet.id}`,
    });
  } catch (error) {
    console.error('Error creating snippet:', error);
    return NextResponse.json(
      { error: 'Failed to create snippet' },
      { status: 500 }
    );
  }
}
