import { beforeAll, describe, expect, it } from 'vitest';
import { addDaysToDate, todayIn } from '../src/domain/time';
import { futureWeekday, json, setupTestApp } from './helpers';

let t: Awaited<ReturnType<typeof setupTestApp>>;
let cookie: string;
let services: Array<{ id: string; name: string; durationMinutes: number; active: boolean }>;
const MONDAY = futureWeekday(1);
const TUESDAY = futureWeekday(2);
const SUNDAY = futureWeekday(0);

const base = () => ({
  clientName: 'Maria Silva',
  clientPhone: '(47) 99999-1234',
  serviceTypeId: services[0]!.id,
  date: MONDAY,
  startTime: '08:00',
  durationMinutes: 90,
  address: 'Rua Reinoldo Rau, 100',
  neighborhood: 'Centro',
});

const create = (body: Record<string, unknown>) => t.request('/appointments', { method: 'POST', cookie, json: body });

beforeAll(async () => {
  t = await setupTestApp();
  cookie = (await t.login()).cookie;
  services = (await json(await t.request('/services', { cookie }))).services;
});

describe('serviços', () => {
  it('lista os serviços iniciais com duração', () => {
    expect(services.length).toBeGreaterThanOrEqual(5);
    expect(services.every((s) => s.durationMinutes >= 15)).toBe(true);
  });

  it('cria e edita serviço com validação', async () => {
    const bad = await t.request('/services', { method: 'POST', cookie, json: { name: 'X', durationMinutes: 5 } });
    expect(bad.status).toBe(422);
    const res = await t.request('/services', { method: 'POST', cookie, json: { name: 'Carga de gás', durationMinutes: 60, color: 'clay' } });
    expect(res.status).toBe(201);
    const { service } = await json(res);
    const upd = await t.request(`/services/${service.id}`, { method: 'PATCH', cookie, json: { durationMinutes: 75, active: false } });
    expect((await json(upd)).service).toMatchObject({ durationMinutes: 75, active: false });
    const dup = await t.request('/services', { method: 'POST', cookie, json: { name: 'carga de GÁS', durationMinutes: 60 } });
    expect(dup.status).toBe(409);
  });
});

describe('agendamentos', () => {
  let createdId: string;

  it('cria atendimento normalizando telefone e calculando término', async () => {
    const res = await create(base());
    expect(res.status).toBe(201);
    const { appointment } = await json(res);
    createdId = appointment.id;
    expect(appointment).toMatchObject({
      clientPhone: '47999991234',
      date: MONDAY,
      startTime: '08:00',
      endTime: '09:30',
      status: 'pending',
      city: 'Jaraguá do Sul',
      outsideBusinessHours: false,
    });
  });

  it('valida campos obrigatórios com mensagens em português', async () => {
    const res = await create({ ...base(), clientName: '', clientPhone: '123', startTime: '25:00' });
    expect(res.status).toBe(422);
    const body = await json(res);
    expect(body.error.details.fields).toMatchObject({
      clientName: expect.any(String),
      clientPhone: expect.stringContaining('Telefone'),
      startTime: expect.any(String),
    });
  });

  it('impede conflito direto de horário', async () => {
    const res = await create({ ...base(), clientName: 'João', startTime: '09:00', durationMinutes: 60 });
    expect(res.status).toBe(409);
    const body = await json(res);
    expect(body.error.code).toBe('SCHEDULE_CONFLICT');
    expect(body.error.details.conflicts[0].clientName).toBe('Maria Silva');
  });

  it('respeita o intervalo de deslocamento configurado', async () => {
    const tooClose = await create({ ...base(), clientName: 'Pedro', startTime: '09:30', durationMinutes: 60 });
    expect(tooClose.status).toBe(409);
    expect((await json(tooClose)).error.message).toContain('intervalo');
    const ok = await create({ ...base(), clientName: 'Pedro', startTime: '10:00', durationMinutes: 60 });
    expect(ok.status).toBe(201);
  });

  it('bloqueia fora do expediente, mas permite encaixe confirmado', async () => {
    const closed = await create({ ...base(), date: SUNDAY, clientName: 'Domingo' });
    expect(closed.status).toBe(422);
    expect((await json(closed)).error.code).toBe('OUTSIDE_SCHEDULE');

    const lunch = await create({ ...base(), date: TUESDAY, startTime: '12:00', durationMinutes: 60 });
    expect(lunch.status).toBe(422);

    const forced = await create({ ...base(), date: SUNDAY, clientName: 'Emergência', allowOutsideHours: true });
    expect(forced.status).toBe(201);
    expect((await json(forced)).appointment.outsideBusinessHours).toBe(true);
  });

  it('o encaixe nunca ignora conflitos', async () => {
    const res = await create({ ...base(), clientName: 'Conflito forçado', startTime: '08:30', allowOutsideHours: true });
    expect(res.status).toBe(409);
  });

  it('garante no banco que não há sobreposição, mesmo em requisições simultâneas', async () => {
    const payload = { ...base(), date: TUESDAY, startTime: '14:00', durationMinutes: 60 };
    const results = await Promise.all([
      create({ ...payload, clientName: 'Concorrente A' }),
      create({ ...payload, clientName: 'Concorrente B' }),
      create({ ...payload, clientName: 'Concorrente C' }),
    ]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409]);
  });

  it('constraint de exclusão do PostgreSQL bloqueia inserção direta sobreposta', async () => {
    const { appointments } = await import('../src/database/schema');
    const s = new Date(`${TUESDAY}T17:30:00.000Z`); // 14:30 em Jaraguá do Sul
    await expect(
      t.db.insert(appointments).values({
        clientName: 'Direto no banco',
        clientPhone: '47999990000',
        serviceTypeId: services[0]!.id,
        startsAt: s,
        endsAt: new Date(s.getTime() + 30 * 60000),
        address: 'Rua X',
        neighborhood: 'Centro',
      }),
    ).rejects.toThrow();
  });

  it('edita e remarca com nova validação de conflito', async () => {
    const conflict = await t.request(`/appointments/${createdId}`, { method: 'PATCH', cookie, json: { startTime: '10:30' } });
    expect(conflict.status).toBe(409);

    const res = await t.request(`/appointments/${createdId}`, {
      method: 'PATCH',
      cookie,
      json: { startTime: '15:00', durationMinutes: 120, notes: 'Levar escada', clientName: 'Maria S. Silva' },
    });
    expect(res.status).toBe(200);
    expect((await json(res)).appointment).toMatchObject({
      startTime: '15:00',
      endTime: '17:00',
      notes: 'Levar escada',
      clientName: 'Maria S. Silva',
    });

    const clear = await t.request(`/appointments/${createdId}`, { method: 'PATCH', cookie, json: { notes: '' } });
    expect((await json(clear)).appointment.notes).toBeNull();
  });

  it('altera status (confirmar, concluir, cancelar e reativar)', async () => {
    const patch = (status: string) => t.request(`/appointments/${createdId}/status`, { method: 'PATCH', cookie, json: { status } });
    expect((await json(await patch('confirmed'))).appointment.status).toBe('confirmed');
    const done = (await json(await patch('completed'))).appointment;
    expect(done.status).toBe('completed');
    expect(done.completedAt).toBeTruthy();
    const cancelled = (await json(await patch('cancelled'))).appointment;
    expect(cancelled.cancelledAt).toBeTruthy();
    expect(cancelled.completedAt).toBeNull();
    expect((await patch('invalido')).status).toBe(422);

    // horário liberado pelo cancelamento pode ser ocupado...
    const other = await create({ ...base(), clientName: 'Ocupa vaga', startTime: '15:00', durationMinutes: 60 });
    expect(other.status).toBe(201);
    // ...e então a reativação do cancelado entra em conflito
    expect((await patch('pending')).status).toBe(409);
  });

  it('pesquisa por cliente, telefone e bairro, e filtra por status e datas', async () => {
    const byName = await json(await t.request(`/appointments?search=${encodeURIComponent('pedro')}`, { cookie }));
    expect(byName.items.map((a: { clientName: string }) => a.clientName)).toContain('Pedro');

    const byPhone = await json(await t.request('/appointments?search=99999-1234', { cookie }));
    expect(byPhone.total).toBeGreaterThan(0);

    const wildcard = await json(await t.request(`/appointments?search=${encodeURIComponent('%')}`, { cookie }));
    expect(wildcard.total).toBe(0);

    const cancelled = await json(await t.request('/appointments?status=cancelled', { cookie }));
    expect(cancelled.items.every((a: { status: string }) => a.status === 'cancelled')).toBe(true);

    // período: tudo que ocupa o dia, inclusive o que começou antes
    const range = await json(await t.request(`/appointments?from=${TUESDAY}&to=${TUESDAY}`, { cookie }));
    expect(range.items.every((a: { date: string; endDate: string }) => a.date <= TUESDAY && a.endDate >= TUESDAY)).toBe(true);

    const bad = await t.request('/appointments?status=foo', { cookie });
    expect(bad.status).toBe(422);
  });

  it('informa disponibilidade do dia para o seletor de horário', async () => {
    const res = await t.request(`/availability?date=${MONDAY}&durationMinutes=60`, { cookie });
    const { availability } = await json(res);
    expect(availability.open).toBe(true);
    expect(availability.hours).toEqual({ start: '08:00', end: '18:00' });
    const state = (time: string) => availability.slots.find((s: { time: string }) => s.time === time)?.state;
    expect(state('10:00')).toBe('busy');
    expect(state('12:00')).toBe('break');
  });

  it('aceita atendimento que termina em outro dia e ocupa o período inteiro', async () => {
    const wed = futureWeekday(3, 28);
    const thu = addDaysToDate(wed, 1);
    // quarta 14h → quinta 11h
    const res = await create({ ...base(), date: wed, startTime: '14:00', durationMinutes: 21 * 60, clientName: 'Obra em dois dias' });
    expect(res.status).toBe(201);
    const { appointment } = await json(res);
    expect(appointment).toMatchObject({ date: wed, startTime: '14:00', endDate: thu, endTime: '11:00', durationMinutes: 21 * 60, outsideBusinessHours: false });

    // o segundo dia fica ocupado
    expect((await create({ ...base(), date: thu, startTime: '09:00', durationMinutes: 60, clientName: 'Choque' })).status).toBe(409);
    const thursday = await json(await t.request(`/appointments?from=${thu}&to=${thu}`, { cookie }));
    expect(thursday.items.map((a: { id: string }) => a.id)).toContain(appointment.id);
    const { availability } = await json(await t.request(`/availability?date=${thu}&durationMinutes=60`, { cookie }));
    const state = (time: string) => availability.slots.find((s: { time: string }) => s.time === time)?.state;
    expect(state('09:00')).toBe('busy');
    expect(state('14:00')).toBe('available');

    // término fora do expediente pede encaixe; mais de 14 dias é recusado
    const late = await create({ ...base(), date: addDaysToDate(wed, 7), startTime: '14:00', durationMinutes: 30 * 60, clientName: 'Termina tarde' });
    expect((await json(late)).error.code).toBe('OUTSIDE_SCHEDULE');
    expect((await create({ ...base(), date: addDaysToDate(wed, 14), durationMinutes: 15 * 24 * 60 })).status).toBe(422);

    // remarcar para terminar no mesmo dia volta a ser um atendimento comum
    const moved = await t.request(`/appointments/${appointment.id}`, { method: 'PATCH', cookie, json: { durationMinutes: 120 } });
    expect((await json(moved)).appointment).toMatchObject({ endDate: wed, endTime: '16:00' });
  });

  it('registra serviço já feito, inclusive o que começou ontem e terminou hoje', async () => {
    const today = todayIn('America/Sao_Paulo');
    const yesterday = addDaysToDate(today, -1);
    const lastWeek = addDaysToDate(today, -7);
    // no passado, sem encaixe, desde que dentro do expediente
    const done = await create({ ...base(), date: lastWeek, startTime: '00:00', durationMinutes: 60, clientName: 'Já feito', allowOutsideHours: true, status: 'completed' });
    expect(done.status).toBe(201);
    expect((await json(done)).appointment).toMatchObject({ date: lastWeek, status: 'completed' });

    // começou ontem e terminou hoje: o encaixe cobre o caso de ontem/hoje cair em dia sem expediente
    const res = await create({ ...base(), date: yesterday, startTime: '14:00', durationMinutes: 21 * 60, clientName: 'Ontem e hoje', allowOutsideHours: true, status: 'completed' });
    expect(res.status).toBe(201);
    expect((await json(res)).appointment).toMatchObject({ date: yesterday, endDate: today, endTime: '11:00' });

    // a grade do dia mostra os horários que já passaram como selecionáveis (não ocupados)
    const { availability } = await json(await t.request(`/availability?date=${lastWeek}&durationMinutes=60`, { cookie }));
    expect(availability.slots.some((s: { state: string }) => s.state === 'past' || s.state === 'after_hours')).toBe(true);
    expect(availability.slots.every((s: { state: string }) => s.state !== 'available' && s.state !== 'too_soon')).toBe(true);
  });

  it('aceita passado sem encaixe quando o horário está dentro do expediente', async () => {
    // segunda-feira anterior, 09:00 (expediente 08h–18h)
    const pastMonday = addDaysToDate(MONDAY, -14);
    const res = await create({ ...base(), date: pastMonday, startTime: '09:00', durationMinutes: 60, clientName: 'Segunda passada' });
    expect(res.status).toBe(201);
    expect((await json(res)).appointment).toMatchObject({ outsideBusinessHours: false });
  });

  it('salva só com nome, serviço e horário, e deixa completar telefone e endereço depois', async () => {
    const res = await create({
      clientName: 'Cliente sem endereço',
      clientPhone: '',
      serviceTypeId: services[0]!.id,
      date: TUESDAY,
      startTime: '08:00',
      durationMinutes: 60,
      address: '',
      neighborhood: '   ',
    });
    expect(res.status).toBe(201);
    const { appointment } = await json(res);
    expect(appointment).toMatchObject({ clientPhone: null, address: null, neighborhood: null, city: 'Jaraguá do Sul' });

    // completar depois
    const filled = await t.request(`/appointments/${appointment.id}`, {
      method: 'PATCH',
      cookie,
      json: { clientPhone: '(47) 98888-7777', address: 'Rua Walter Marquardt, 500', neighborhood: 'Vila Nova' },
    });
    expect((await json(filled)).appointment).toMatchObject({ clientPhone: '47988887777', address: 'Rua Walter Marquardt, 500', neighborhood: 'Vila Nova' });

    // campo ausente não muda; vazio apaga; telefone incompleto é recusado
    const partial = await t.request(`/appointments/${appointment.id}`, { method: 'PATCH', cookie, json: { neighborhood: '' } });
    expect((await json(partial)).appointment).toMatchObject({ clientPhone: '47988887777', neighborhood: null, address: 'Rua Walter Marquardt, 500' });
    const bad = await t.request(`/appointments/${appointment.id}`, { method: 'PATCH', cookie, json: { clientPhone: '4799' } });
    expect(bad.status).toBe(422);

    // a busca continua funcionando com campos vazios
    const found = await json(await t.request('/appointments?search=sem%20endere', { cookie }));
    expect(found.items.map((a: { id: string }) => a.id)).toContain(appointment.id);
  });

  it('exclui atendimento', async () => {
    const res = await create({ ...base(), date: TUESDAY, startTime: '16:00', durationMinutes: 60, clientName: 'Excluir' });
    const { appointment } = await json(res);
    expect((await t.request(`/appointments/${appointment.id}`, { method: 'DELETE', cookie })).status).toBe(200);
    expect((await t.request(`/appointments/${appointment.id}`, { cookie })).status).toBe(404);
    expect((await t.request('/appointments/nao-e-uuid', { cookie })).status).toBe(422);
  });

  it('monta o resumo do painel', async () => {
    const { dashboard } = await json(await t.request('/dashboard', { cookie }));
    expect(dashboard.week.days).toHaveLength(7);
    expect(dashboard.pendingConfirmation.total).toBeGreaterThan(0);
    expect(dashboard.next).not.toBeNull();
    expect(typeof dashboard.month.label).toBe('string');
  });
});

describe('configurações', () => {
  it('altera expediente e a nova regra passa a valer', async () => {
    const { settings } = await json(await t.request('/settings', { cookie }));
    expect(settings.weeklyHours).toHaveLength(7);

    const weeklyHours = settings.weeklyHours.map((d: { weekday: number }) => (d.weekday === 0 ? { ...d, enabled: true, start: '09:00', end: '12:00' } : d));
    const res = await t.request('/settings', {
      method: 'PUT',
      cookie,
      json: { ...settings, weeklyHours, bufferMinutes: 0, businessWhatsapp: '+55 (47) 98888-7777' },
    });
    expect(res.status).toBe(200);
    expect((await json(res)).settings.businessWhatsapp).toBe('47988887777');

    const sunday = await create({ ...base(), date: futureWeekday(0, 14), startTime: '09:00', durationMinutes: 60, clientName: 'Domingo aberto' });
    expect(sunday.status).toBe(201);
  });

  it('valida configurações inconsistentes', async () => {
    const { settings } = await json(await t.request('/settings', { cookie }));
    const res = await t.request('/settings', {
      method: 'PUT',
      cookie,
      json: { ...settings, breaks: [{ start: '13:00', end: '12:00', label: 'Errada' }], slotIntervalMinutes: 7 },
    });
    expect(res.status).toBe(422);
  });
});
