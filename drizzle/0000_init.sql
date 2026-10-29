CREATE TYPE "public"."menu_source" AS ENUM('scan', 'manual', 'sample');--> statement-breakpoint
CREATE TABLE "dish_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"dish_key" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"saved" boolean DEFAULT false NOT NULL,
	"tried" boolean DEFAULT false NOT NULL,
	"rating" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dish_feedback_rating_range" CHECK ("dish_feedback"."rating" IS NULL OR "dish_feedback"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"source" "menu_source" NOT NULL,
	"cuisine" text,
	"items" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taste_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"profile" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "dish_feedback_user_dish_idx" ON "dish_feedback" USING btree ("user_id","dish_key");--> statement-breakpoint
CREATE INDEX "dish_feedback_user_updated_idx" ON "dish_feedback" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "menus_user_created_idx" ON "menus" USING btree ("user_id","created_at");