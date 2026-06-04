CREATE TABLE `dead_letters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`queue` text NOT NULL,
	`body` text NOT NULL,
	`failed_at` integer NOT NULL
);
