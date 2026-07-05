CREATE TABLE `project_achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_skills` (
	`project_id` integer NOT NULL,
	`skill_id` integer NOT NULL,
	PRIMARY KEY(`project_id`, `skill_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text NOT NULL,
	`description` text NOT NULL,
	`github_url` text,
	`video_url` text,
	`image_url` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skills_name_unique` ON `skills` (`name`);--> statement-breakpoint
CREATE TABLE `timeline` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`subtitle` text NOT NULL,
	`date_display` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`outcome` text,
	`sort_key` integer NOT NULL,
	`is_featured` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `timeline_achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timeline_id` integer NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`timeline_id`) REFERENCES `timeline`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `timeline_skills` (
	`timeline_id` integer NOT NULL,
	`skill_id` integer NOT NULL,
	PRIMARY KEY(`timeline_id`, `skill_id`),
	FOREIGN KEY (`timeline_id`) REFERENCES `timeline`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
