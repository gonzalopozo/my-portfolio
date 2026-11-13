CREATE TABLE `project_image_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` integer NOT NULL,
	`store_origin` text NOT NULL,
	`candidate_url` text,
	`previous_image` text,
	`state` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`applied_at` integer,
	`lease_token` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`last_failure` text
);
--> statement-breakpoint
CREATE INDEX `project_image_operations_due` ON `project_image_operations` (`state`,`lease_until`,`created_at`);