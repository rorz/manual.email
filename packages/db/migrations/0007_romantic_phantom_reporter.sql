CREATE TABLE `invite_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer,
	`reserved_at` integer,
	`used_at` integer,
	`used_by_user_id` text,
	FOREIGN KEY (`used_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_invite_codes_used_by_user` ON `invite_codes` (`used_by_user_id`);--> statement-breakpoint
CREATE INDEX `idx_invite_codes_expires` ON `invite_codes` (`expires_at`);