/**
 * Dados de demonstração para desenvolvimento local (nunca em produção).
 *   npm run db:seed
 */
import '../config/load-env';
import { getEnv } from '../config/env';
import { addDaysToDate, todayIn } from '../domain/time';
import { createAppointment } from '../modules/appointments/appointments.service';
import { listServices } from '../modules/services/services.service';
import { getScheduleRules } from '../modules/settings/settings.service';
import { getDb } from './client';
import { appointments } from './schema';

async function main() {
  const env = getEnv();
  if (env.NODE_ENV === 'production' || (env.DATABASE_URL && !process.argv.includes('--force'))) {
    throw new Error('Seed de demonstração é apenas para o banco local. Use --force para um banco de testes.');
  }
  const db = await getDb();
  const rules = await getScheduleRules(db);
  const services = await listServices(db);
  const byName = (part: string) => services.find((s) => s.name.toLowerCase().includes(part))!;
  const today = todayIn(rules.timezone);

  await db.delete(appointments);

  const plan: Array<[number, string, string, string, string, string, string, 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'in_progress']> = [
    [-2, '08:30', 'Mariana Krause', '47991230001', 'instala', 'Rua Reinoldo Rau, 410', 'Centro', 'completed'],
    [-1, '14:00', 'Condomínio Vila Nova', '47991230002', 'preventiva', 'Rua Walter Marquardt, 1200', 'Vila Nova', 'completed'],
    [0, '08:00', 'Paulo Schmitt', '47991230003', 'higieniza', 'Rua João Planinscheck, 88', 'Nova Brasília', 'confirmed'],
    [0, '14:00', 'Ana Beatriz Lemke', '47991230004', 'corretiva', 'Rua Bernardo Dornbusch, 52', 'Baependi', 'pending'],
    [0, '16:30', 'Clínica Bem Viver', '47991230005', 'visita', 'Av. Mal. Deodoro da Fonseca, 900', 'Centro', 'confirmed'],
    [1, '09:00', 'Rafael Moretti', '47991230006', 'instala', 'Rua Ângelo Rubini, 300', 'Barra do Rio Cerro', 'confirmed'],
    [1, '15:00', 'Juliana Piske', '47991230007', 'higieniza', 'Rua José Theodoro Ribeiro, 1500', 'Ilha da Figueira', 'pending'],
    [2, '08:00', 'Escritório Contábil Rau', '47991230008', 'preventiva', 'Rua Expedicionário Gumercindo da Silva, 77', 'Rau', 'pending'],
    [3, '13:30', 'Thiago Weiss', '47991230009', 'corretiva', 'Rua Joinville, 2100', 'Vila Lalau', 'cancelled'],
    [4, '10:00', 'Fernanda Rosa', '47991230010', 'higieniza', 'Rua Max Wilhelm, 640', 'Baependi', 'confirmed'],
    [6, '08:30', 'Loja Tecidos Jaraguá', '47991230011', 'instala', 'Rua Presidente Epitácio Pessoa, 210', 'Centro', 'pending'],
  ];

  let created = 0;
  for (const [offset, time, client, phone, service, address, neighborhood, status] of plan) {
    try {
      await createAppointment(db, {
        clientName: client,
        clientPhone: phone,
        serviceTypeId: byName(service).id,
        date: addDaysToDate(today, offset),
        startTime: time,
        durationMinutes: byName(service).durationMinutes,
        address,
        neighborhood,
        city: 'Jaraguá do Sul',
        notes: null,
        status,
        allowOutsideHours: true,
      });
      created++;
    } catch (err) {
      console.warn(`Ignorado (${client}): ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`Seed concluído: ${created} atendimentos de demonstração.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
