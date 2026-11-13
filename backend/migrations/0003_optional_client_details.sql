-- Telefone, endereço, bairro e cidade podem ficar em branco ao registrar um atendimento (completados depois).
ALTER TABLE "appointments" ALTER COLUMN "client_phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "neighborhood" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "city" DROP NOT NULL;