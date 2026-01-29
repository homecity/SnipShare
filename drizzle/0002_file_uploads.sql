-- Add file upload support to snippets table
ALTER TABLE `snippets` ADD COLUMN `type` text DEFAULT 'text';
ALTER TABLE `snippets` ADD COLUMN `file_name` text;
ALTER TABLE `snippets` ADD COLUMN `file_size` integer;
ALTER TABLE `snippets` ADD COLUMN `file_type` text;
ALTER TABLE `snippets` ADD COLUMN `r2_key` text;
