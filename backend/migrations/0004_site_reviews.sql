-- Avaliações de clientes exibidas no site (copiadas do Google no painel).
CREATE TABLE "site_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author" text NOT NULL,
	"rating" smallint NOT NULL,
	"text" text NOT NULL,
	"month" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_reviews_rating_check" CHECK ("site_reviews"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE INDEX "site_reviews_month_idx" ON "site_reviews" USING btree ("month");