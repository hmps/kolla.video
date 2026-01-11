CREATE TABLE `segment_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`segment_id` integer NOT NULL,
	`author_id` integer NOT NULL,
	`body` text NOT NULL,
	`level` text DEFAULT 'coaches' NOT NULL,
	`target_user_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`segment_id`) REFERENCES `segments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `segment_players` (
	`segment_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	FOREIGN KEY (`segment_id`) REFERENCES `segments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `segment_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`segment_id` integer NOT NULL,
	`tag` text NOT NULL,
	FOREIGN KEY (`segment_id`) REFERENCES `segments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `segments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	`clip_id` integer NOT NULL,
	`creator_id` integer NOT NULL,
	`index` integer NOT NULL,
	`name` text,
	`start_s` real NOT NULL,
	`end_s` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`clip_id`) REFERENCES `clips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `segments_event_id_index_unique` ON `segments` (`event_id`,`index`);