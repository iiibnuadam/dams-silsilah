ALTER TABLE "share_links" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "trees" ADD COLUMN "cover_photo_url" text;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_slug_unique" UNIQUE("slug");