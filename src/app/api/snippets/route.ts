import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createSnippet } from '@/lib/db';
import { encryptContent } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
    const maxExpiration = 14 * 24 * 60 * 60 * 1000; // 2 weeks in ms
    if (expiresIn && expiresIn > maxExpiration) {
      return NextResponse.json(
        { error: 'Maximum expiration is 2 weeks' },
        { status: 400 }
      );
    }

    const id = nanoid(10);

    // Encrypt content if password provided
    const finalContent = password ? encryptContent(content, password) : content;

    const snippet = createSnippet({
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
