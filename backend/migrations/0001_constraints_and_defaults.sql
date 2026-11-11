-- Garante no banco que dois atendimentos ativos nunca ocupem o mesmo intervalo.
-- Atendimentos cancelados não participam da restrição.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" <> 'cancelled');--> statement-breakpoint

-- Configuração inicial da agenda (ajustável pelo proprietário no painel).
-- Endereço informado pelo cliente: apenas o bairro.
INSERT INTO "schedule_settings" (
  "id", "weekly_hours", "breaks", "default_duration_minutes", "buffer_minutes",
  "min_advance_minutes", "slot_interval_minutes", "business_name", "business_address", "confirmation_template"
) VALUES (
  1,
  '[
    {"weekday":0,"enabled":false,"start":"08:00","end":"12:00"},
    {"weekday":1,"enabled":true,"start":"08:00","end":"18:00"},
    {"weekday":2,"enabled":true,"start":"08:00","end":"18:00"},
    {"weekday":3,"enabled":true,"start":"08:00","end":"18:00"},
    {"weekday":4,"enabled":true,"start":"08:00","end":"18:00"},
    {"weekday":5,"enabled":true,"start":"08:00","end":"18:00"},
    {"weekday":6,"enabled":true,"start":"08:00","end":"12:00"}
  ]'::jsonb,
  '[{"start":"12:00","end":"13:30","label":"Almoço"}]'::jsonb,
  90, 30, 60, 30,
  'ORTS Climatização',
  'Vila Nova, Jaraguá do Sul - SC',
  'Olá, {cliente}! Aqui é da {empresa}. Confirmando seu atendimento de {servico} em {data}, às {horario}, no endereço {endereco}. Qualquer imprevisto, é só responder esta mensagem.'
) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

-- Tipos de serviço iniciais (o proprietário pode editar nomes e durações).
INSERT INTO "service_types" ("name", "description", "duration_minutes", "color", "sort_order") VALUES
  ('Instalação de ar-condicionado', 'Instalação de split com fixação, tubulação e teste de funcionamento.', 180, 'navy', 1),
  ('Higienização', 'Limpeza de filtros, serpentina e bandeja da unidade interna.', 90, 'teal', 2),
  ('Manutenção preventiva', 'Revisão periódica para manter eficiência e evitar falhas.', 90, 'sage', 3),
  ('Manutenção corretiva', 'Diagnóstico e correção de falhas no equipamento.', 120, 'clay', 4),
  ('Visita técnica / orçamento', 'Avaliação no local para orçamento de instalação ou reparo.', 60, 'champagne', 5)
ON CONFLICT DO NOTHING;
