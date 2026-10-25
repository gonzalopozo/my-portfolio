ALTER TABLE `skills` ADD `use_brand_color` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `skills` ADD `custom_icon_color` text;--> statement-breakpoint
ALTER TABLE `social_links` ADD `background_color` text DEFAULT '#66696D' NOT NULL;