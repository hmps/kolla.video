ALTER TABLE `comments` ADD `level` text DEFAULT 'coaches' NOT NULL;--> statement-breakpoint
ALTER TABLE `comments` ADD `target_user_id` integer REFERENCES users(id);