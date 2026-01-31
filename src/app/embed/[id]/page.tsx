import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSnippetById } from '@/lib/db';
import { getD1Db } from '@/lib/d1';
import { decryptWithKey, base64ToArrayBuffer } from '@/lib/encryption';
import EmbedView from './EmbedView';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: 'Embedded Snippet - snipit.sh',
    robots: { index: false, follow: false },
  };
}

export default async function EmbedPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolved = await searchParams;
  const theme = (resolved?.theme as string) || 'dark';

  let db;
  try {
    db = await getD1Db();
  } catch {
    notFound();
  }

  const snippet = await getSnippetById(db, id);

  if (!snippet || snippet.burn_after_read || snippet.is_encrypted) {
    notFound();
  }

  // Decrypt server-side encryption
  let content = snippet.content;
  if (snippet.encryption_key) {
    try {
      const encryptedBuffer = base64ToArrayBuffer(content);
      const decryptedBuffer = await decryptWithKey(encryptedBuffer, snippet.encryption_key);
      content = new TextDecoder().decode(decryptedBuffer);
    } catch {
      content = snippet.content;
    }
  }

  return (
    <EmbedView
      id={snippet.id}
      content={content}
      language={snippet.language}
      title={snippet.title}
      theme={theme}
    />
  );
}
