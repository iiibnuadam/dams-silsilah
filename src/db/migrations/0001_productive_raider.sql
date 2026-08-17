CREATE TYPE "public"."user_role" AS ENUM('user', 'superadmin');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"registration_open" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "disabled" boolean DEFAULT false NOT NULL;