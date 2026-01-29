import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const snippets = sqliteTable('snippets', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  language: text('language').notNull().default('plaintext'),
  title: text('title'),
  password_hash: text('password_hash'),
  password_salt: text('password_salt'),
  is_encrypted: integer('is_encrypted', { mode: 'boolean' }).notNull().default(false),
  expires_at: integer('expires_at'),
  burn_after_read: integer('burn_after_read', { mode: 'boolean' }).notNull().default(false),
  view_count: integer('view_count').notNull().default(0),
  created_at: integer('created_at').notNull(),
  is_deleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});

export const rateLimits = sqliteTable('rate_limits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ip: text('ip').notNull(),
  action: text('action').notNull(),
  timestamp: integer('timestamp').notNull(),
});

export const blockedIps = sqliteTable('blocked_ips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ip: text('ip').notNull(),
  reason: text('reason'),
  blocked_at: integer('blocked_at').notNull(),
  blocked_by: text('blocked_by').default('admin'),
});

export type Snippet = typeof snippets.$inferSelect;
export type NewSnippet = typeof snippets.$inferInsert;
export type BlockedIp = typeof blockedIps.$inferSelect;
