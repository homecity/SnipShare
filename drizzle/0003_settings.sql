-- Dynamic settings table
CREATE TABLE IF NOT EXISTS `settings` (
  `key` text PRIMARY KEY NOT NULL,
  `value` text NOT NULL,
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);

-- Insert default values
INSERT OR IGNORE INTO `settings` (`key`, `value`, `updated_at`) VALUES
  ('rate_limit_per_minute', '10', datetime('now')),
  ('rate_limit_per_hour', '20', datetime('now')),
  ('rate_limit_per_day', '100', datetime('now')),
  ('max_file_size_mb', '5', datetime('now')),
  ('allowed_file_types', '.txt,.md,.pdf,.json,.csv,.log,.xml,.yaml,.yml,.html,.css,.js,.ts,.py,.sh,.sql,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip', datetime('now'));
