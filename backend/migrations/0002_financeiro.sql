CREATE TYPE "public"."finance_kind" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."finance_status" AS ENUM('paid', 'pending');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('pix', 'cash', 'debit_card', 'credit_card', 'bank_transfer', 'boleto', 'other');--> statement-breakpoint
CREATE TABLE "finance_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "finance_kind" NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "finance_kind" NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"category_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" "finance_status" DEFAULT 'paid' NOT NULL,
	"payment_method" "payment_method",
	"appointment_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_entries_amount_check" CHECK ("finance_entries"."amount_cents" > 0 and "finance_entries"."amount_cents" <= 100000000)
);
--> statement-breakpoint
ALTER TABLE "schedule_settings" ADD COLUMN "mei_annual_limit_cents" integer;--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "price_cents" integer;--> statement-breakpoint
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_category_id_finance_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."finance_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "finance_categories_kind_name_unique" ON "finance_categories" USING btree ("kind",lower("name"));--> statement-breakpoint
CREATE INDEX "finance_entries_date_idx" ON "finance_entries" USING btree ("date");--> statement-breakpoint
CREATE INDEX "finance_entries_status_date_idx" ON "finance_entries" USING btree ("status","date");--> statement-breakpoint
CREATE INDEX "finance_entries_category_idx" ON "finance_entries" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "finance_entries_appointment_idx" ON "finance_entries" USING btree ("appointment_id");--> statement-breakpoint
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_price_check" CHECK ("service_types"."price_cents" is null or "service_types"."price_cents" between 0 and 100000000);--> statement-breakpoint
-- Categorias iniciais (o proprietário pode renomear, criar e arquivar no painel).
INSERT INTO "finance_categories" ("kind", "name", "sort_order") VALUES
  ('income', 'Serviços', 0),
  ('income', 'Venda de peças e equipamentos', 1),
  ('income', 'Outras entradas', 2),
  ('expense', 'Materiais e peças', 0),
  ('expense', 'Combustível e deslocamento', 1),
  ('expense', 'Ferramentas e equipamentos', 2),
  ('expense', 'Manutenção do veículo', 3),
  ('expense', 'Impostos e taxas (DAS)', 4),
  ('expense', 'Telefone e internet', 5),
  ('expense', 'Alimentação', 6),
  ('expense', 'Divulgação', 7),
  ('expense', 'Tarifas e maquininha', 8),
  ('expense', 'Outras saídas', 9);
