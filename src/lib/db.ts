import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and, lt } from 'drizzle-orm';
import { snippets, rateLimits, settings } from './schema';
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
  // File upload fields
  type?: 'text' | 'file';
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  r2Key?: string;
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
    type = 'text',
    fileName,
    fileSize,
    fileType,
    r2Key,
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
    type,
    file_name: fileName || null,
    file_size: fileSize || null,
    file_type: fileType || null,
    r2_key: r2Key || null,
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

// Get expired snippets that need cleanup (returns R2 keys for file deletion)
export async function getExpiredFileKeys(
  db: DrizzleD1Database
): Promise<string[]> {
  const now = Date.now();
  const results = await db
    .select({ r2_key: snippets.r2_key })
    .from(snippets)
    .where(
      and(
        eq(snippets.is_deleted, false),
        eq(snippets.type, 'file'),
        lt(snippets.expires_at, now)
      )
    );

  return results
    .map(r => r.r2_key)
    .filter((key): key is string => key !== null);
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

// ── Settings ──────────────────────────────────────────────

export interface AppSettings {
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  max_file_size_mb: number;
  allowed_file_types: string; // comma-separated extensions
}

const DEFAULT_SETTINGS: AppSettings = {
  rate_limit_per_minute: 10,
  rate_limit_per_hour: 20,
  rate_limit_per_day: 100,
  max_file_size_mb: 5,
  allowed_file_types: '.txt,.md,.pdf,.json,.csv,.log,.xml,.yaml,.yml,.html,.css,.js,.ts,.py,.sh,.sql,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip',
};

export async function getSettings(db: DrizzleD1Database): Promise<AppSettings> {
  try {
    const rows = await db.select().from(settings);
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return {
      rate_limit_per_minute: parseInt(map.rate_limit_per_minute, 10) || DEFAULT_SETTINGS.rate_limit_per_minute,
      rate_limit_per_hour: parseInt(map.rate_limit_per_hour, 10) || DEFAULT_SETTINGS.rate_limit_per_hour,
      rate_limit_per_day: parseInt(map.rate_limit_per_day, 10) || DEFAULT_SETTINGS.rate_limit_per_day,
      max_file_size_mb: parseInt(map.max_file_size_mb, 10) || DEFAULT_SETTINGS.max_file_size_mb,
      allowed_file_types: map.allowed_file_types ?? DEFAULT_SETTINGS.allowed_file_types,
    };
  } catch {
    // Table might not exist yet
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateSetting(
  db: DrizzleD1Database,
  key: string,
  value: string
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.select().from(settings).where(eq(settings.key, key));
  if (existing.length > 0) {
    await db.update(settings).set({ value, updated_at: now }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value, updated_at: now });
  }
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
