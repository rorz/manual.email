CREATE TABLE `filter_configs` (
	`account_id` text PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'managed' NOT NULL,
	`system_prompt` text DEFAULT '' NOT NULL,
	`custom_source` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `message_tags` (
	`message_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`message_id`, `tag_id`),
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_message_tags_tag` ON `message_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `message_verdicts` (
	`message_id` text PRIMARY KEY NOT NULL,
	`disposition` text NOT NULL,
	`category` text,
	`reason` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`slug` text NOT NULL,
	`label` text NOT NULL,
	`color` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_tags_account_slug` ON `tags` (`account_id`,`slug`);--> statement-breakpoint
CREATE TABLE `tray_tags` (
	`tray_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`tray_id`, `tag_id`),
	FOREIGN KEY (`tray_id`) REFERENCES `trays`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trays` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'tag' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_trays_account` ON `trays` (`account_id`);