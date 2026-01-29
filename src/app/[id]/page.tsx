import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import SnippetClient from './SnippetClient';
import { getSnippetById, incrementViewCount, markAsDeleted } from '@/lib/db';
import { getD1Db } from '@/lib/d1';


interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const db = await getD1Db();
    const snippet = await getSnippetById(db, id);

    if (!snippet) {
      return {
        title: 'Snippet Not Found',
        description: 'This snippet does not exist or has expired.',
        robots: { index: false },
      };
    }

    const title = snippet.title
      ? `${snippet.title} - ${snippet.language} Snippet`
      : `${snippet.language.charAt(0).toUpperCase() + snippet.language.slice(1)} Snippet`;

    const description = snippet.is_encrypted
      ? 'This snippet is password protected. Enter the password to view it on SnipShare.'
      : `A ${snippet.language} code snippet shared via SnipShare. View count: ${snippet.view_count}.`;

    const url = `https://steveyu.au/${id}`;

    return {
      title,
      description,
      alternates: {
        canonical: url,
      },
      openGraph: {
        title,
        description,
        type: 'article',
        siteName: 'SnipShare',
        url,
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
      robots: {
        index: !snippet.burn_after_read && !snippet.is_encrypted,
        follow: true,
      },
    };
  } catch {
    return {
      title: 'SnipShare',
      description: 'Share text and code snippets securely',
    };
  }
}

export default async function SnippetPage({ params }: PageProps) {
  const { id } = await params;

  let db;
  try {
    db = await getD1Db();
  } catch {
    notFound();
  }

  const snippet = await getSnippetById(db, id);

  if (!snippet) {
    notFound();
  }

  // For non-encrypted snippets, handle view tracking on server
  if (!snippet.is_encrypted) {
    await incrementViewCount(db, id);

    if (snippet.burn_after_read) {
      await markAsDeleted(db, id);
    }

    return (
      <SnippetClient
        initialData={{
          id: snippet.id,
          content: snippet.content,
          language: snippet.language,
          title: snippet.title,
          viewCount: snippet.view_count + 1,
          createdAt: snippet.created_at,
          expiresAt: snippet.expires_at,
          burnAfterRead: snippet.burn_after_read,
          requiresPassword: false,
        }}
      />
    );
  }

  // For encrypted snippets, don't expose content
  return (
    <SnippetClient
      initialData={{
        id: snippet.id,
        language: snippet.language,
        title: snippet.title,
        viewCount: snippet.view_count,
        createdAt: snippet.created_at,
        expiresAt: snippet.expires_at,
        burnAfterRead: snippet.burn_after_read,
        requiresPassword: true,
      }}
    />
  );
}
