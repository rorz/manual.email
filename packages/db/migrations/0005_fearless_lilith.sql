ALTER TABLE `filter_configs` ADD `safety_prompt` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `filter_configs` ADD `tag_prompt` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `filter_configs` DROP COLUMN `system_prompt`;