import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import SnippetClient from './SnippetClient';
import FileClient from './FileClient';
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

    if (snippet.type === 'file') {
      const title = snippet.file_name
        ? `${snippet.file_name} - Shared File`
        : 'Shared File';
      const description = snippet.is_encrypted
        ? 'This file is password protected. Enter the password to download it on SnipShare.'
        : `A file shared via SnipShare. ${snippet.file_name || ''} (${formatSize(snippet.file_size || 0)})`;

      return {
        title,
        description,
        robots: { index: !snippet.burn_after_read && !snippet.is_encrypted, follow: true },
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
      alternates: { canonical: url },
      openGraph: { title, description, type: 'article', siteName: 'SnipShare', url },
      twitter: { card: 'summary', title, description },
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

  // File type snippet
  if (snippet.type === 'file') {
    if (snippet.is_encrypted) {
      return (
        <FileClient
          initialData={{
            id: snippet.id,
            fileName: snippet.file_name || 'Unknown',
            fileSize: snippet.file_size || 0,
            fileType: snippet.file_type || 'application/octet-stream',
            viewCount: snippet.view_count,
            createdAt: snippet.created_at,
            expiresAt: snippet.expires_at,
            burnAfterRead: snippet.burn_after_read,
            requiresPassword: true,
          }}
        />
      );
    }

    return (
      <FileClient
        initialData={{
          id: snippet.id,
          fileName: snippet.file_name || 'Unknown',
          fileSize: snippet.file_size || 0,
          fileType: snippet.file_type || 'application/octet-stream',
          viewCount: snippet.view_count,
          createdAt: snippet.created_at,
          expiresAt: snippet.expires_at,
          burnAfterRead: snippet.burn_after_read,
          requiresPassword: false,
        }}
      />
    );
  }

  // Text type snippet (existing logic)
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
