import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createSnippet, checkRateLimit } from '@/lib/db';
import { encryptContent } from '@/lib/encryption';
import { getD1Db } from '@/lib/d1';
import { blockedIps } from '@/lib/schema';
import { eq } from 'drizzle-orm';


export async function POST(request: NextRequest) {
  try {
    const db = await getD1Db();

    // Rate limiting: 10 creates per minute per IP
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

    const allowed = await checkRateLimit(db, ip, 'create', 10, 60000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
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

    // Encrypt content if password provided
    const finalContent = password ? await encryptContent(content, password) : content;

    const snippet = await createSnippet(db, {
      id,
      content: finalContent,
      language: language || 'plaintext',
      title,
      password,
      expiresIn,
      burnAfterRead: burnAfterRead || false,
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
