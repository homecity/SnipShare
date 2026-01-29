import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and, lt } from 'drizzle-orm';
import { snippets, rateLimits } from './schema';
import type { Snippet } from './schema';
import { hashPassword, verifyPasswordHash } from './encryption';

export type { Snippet };

// Get D1 database from Cloudflare env
export function getDb(env: { DB: D1Database }): DrizzleD1Database {
  return drizzle(env.DB);
}

export interface CreateSnippetInput {
  id: string;
  content: string;
  language?: string;
  title?: string;
  password?: string;
  expiresIn?: number; // milliseconds
  burnAfterRead?: boolean;
}

// Create a new snippet
export async function createSnippet(
  db: DrizzleD1Database,
  input: CreateSnippetInput
): Promise<Snippet> {
  const {
    id,
    content,
    language = 'plaintext',
    title,
    password,
    expiresIn,
    burnAfterRead = false,
  } = input;

  const expiresAt = expiresIn ? Date.now() + expiresIn : null;

  let passwordHash: string | null = null;
  let passwordSalt: string | null = null;

  if (password) {
    const result = await hashPassword(password);
    passwordHash = result.hash;
    passwordSalt = result.salt;
  }

  const snippet = {
    id,
    content,
    language,
    title: title || null,
    password_hash: passwordHash,
    password_salt: passwordSalt,
    is_encrypted: !!password,
    expires_at: expiresAt,
    burn_after_read: burnAfterRead,
    view_count: 0,
    created_at: Math.floor(Date.now() / 1000),
    is_deleted: false,
  };

  await db.insert(snippets).values(snippet);

  return snippet as Snippet;
}

// Get snippet by ID
export async function getSnippetById(
  db: DrizzleD1Database,
  id: string
): Promise<Snippet | null> {
  const results = await db
    .select()
    .from(snippets)
    .where(and(eq(snippets.id, id), eq(snippets.is_deleted, false)));

  const snippet = results[0] || null;
  if (!snippet) return null;

  // Check if expired
  if (snippet.expires_at && snippet.expires_at < Date.now()) {
    await markAsDeleted(db, id);
    return null;
  }

  return snippet;
}

// Increment view count
export async function incrementViewCount(
  db: DrizzleD1Database,
  id: string
): Promise<void> {
  const results = await db.select().from(snippets).where(eq(snippets.id, id));
  const snippet = results[0];
  if (snippet) {
    await db
      .update(snippets)
      .set({ view_count: snippet.view_count + 1 })
      .where(eq(snippets.id, id));
  }
}

// Mark snippet as deleted
export async function markAsDeleted(
  db: DrizzleD1Database,
  id: string
): Promise<void> {
  await db
    .update(snippets)
    .set({ is_deleted: true })
    .where(eq(snippets.id, id));
}

// Verify password
export async function verifyPassword(
  snippet: Snippet,
  password: string
): Promise<boolean> {
  if (!snippet.password_hash || !snippet.password_salt) return true;
  return verifyPasswordHash(password, snippet.password_hash, snippet.password_salt);
}

// Clean up expired snippets
export async function cleanupExpiredSnippets(
  db: DrizzleD1Database
): Promise<number> {
  const now = Date.now();
  const result = await db
    .update(snippets)
    .set({ is_deleted: true })
    .where(
      and(
        eq(snippets.is_deleted, false),
        lt(snippets.expires_at, now)
      )
    );

  return result.meta?.changes ?? 0;
}

// Rate limiting
export async function checkRateLimit(
  db: DrizzleD1Database,
  ip: string,
  action: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<boolean> {
  const windowStart = Date.now() - windowMs;

  // Clean old entries
  await db
    .delete(rateLimits)
    .where(lt(rateLimits.timestamp, windowStart));

  // Count recent requests
  const results = await db
    .select()
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.ip, ip),
        eq(rateLimits.action, action)
      )
    );

  if (results.length >= maxRequests) {
    return false; // Rate limited
  }

  // Record this request
  await db.insert(rateLimits).values({
    ip,
    action,
    timestamp: Date.now(),
  });

  return true; // Allowed
}
