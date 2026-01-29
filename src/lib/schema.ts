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

export type Snippet = typeof snippets.$inferSelect;
export type NewSnippet = typeof snippets.$inferInsert;
