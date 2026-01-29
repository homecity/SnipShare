CREATE TABLE IF NOT EXISTS `snippets` (
  `id` text PRIMARY KEY NOT NULL,
  `content` text NOT NULL,
  `language` text NOT NULL DEFAULT 'plaintext',
  `title` text,
  `password_hash` text,
  `password_salt` text,
  `is_encrypted` integer NOT NULL DEFAULT 0,
  `expires_at` integer,
  `burn_after_read` integer NOT NULL DEFAULT 0,
  `view_count` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `is_deleted` integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS `rate_limits` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `ip` text NOT NULL,
  `action` text NOT NULL,
  `timestamp` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_snippets_created` ON `snippets` (`created_at`);
CREATE INDEX IF NOT EXISTS `idx_snippets_expires` ON `snippets` (`expires_at`);
CREATE INDEX IF NOT EXISTS `idx_rate_limits_ip` ON `rate_limits` (`ip`, `action`, `timestamp`);
