CREATE TABLE IF NOT EXISTS `blocked_ips` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `ip` text NOT NULL,
  `reason` text,
  `blocked_at` integer NOT NULL,
  `blocked_by` text DEFAULT 'admin'
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_blocked_ips_ip` ON `blocked_ips` (`ip`);
