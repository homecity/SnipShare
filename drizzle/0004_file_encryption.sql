-- Add server-side encryption key for R2 files
ALTER TABLE `snippets` ADD COLUMN `encryption_key` TEXT;
