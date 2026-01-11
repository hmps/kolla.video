CREATE TABLE `upload_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_by_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `upload_links_token_unique` ON `upload_links` (`token`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_clips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	`uploader_id` integer,
	`uploader_name` text,
	`index` integer NOT NULL,
	`name` text,
	`storage_key` text NOT NULL,
	`hls_prefix` text,
	`duration_s` real,
	`width` integer,
	`height` integer,
	`status` text NOT NULL,
	`fail_reason` text,
	`transcoding_job_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_clips`("id", "team_id", "event_id", "uploader_id", "uploader_name", "index", "name", "storage_key", "hls_prefix", "duration_s", "width", "height", "status", "fail_reason", "transcoding_job_id", "created_at") SELECT "id", "team_id", "event_id", "uploader_id", NULL, "index", "name", "storage_key", "hls_prefix", "duration_s", "width", "height", "status", "fail_reason", "transcoding_job_id", "created_at" FROM `clips`;--> statement-breakpoint
DROP TABLE `clips`;--> statement-breakpoint
ALTER TABLE `__new_clips` RENAME TO `clips`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `clips_event_id_index_unique` ON `clips` (`event_id`,`index`);