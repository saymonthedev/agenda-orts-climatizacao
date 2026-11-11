ALTER TABLE "schedule_settings" ADD COLUMN "instagram_url" text;--> statement-breakpoint
ALTER TABLE "schedule_settings" ADD COLUMN "show_hours_on_site" boolean DEFAULT false NOT NULL;