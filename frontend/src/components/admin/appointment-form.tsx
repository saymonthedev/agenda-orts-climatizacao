'use client';

import type { AppointmentDTO, AppointmentStatus, ScheduleViolation } from '@orts/backend/contracts';
import { appointmentCreateSchema, APPOINTMENT_STATUSES, isMultiDay, MAX_APPOINTMENT_MINUTES, STATUS_LABELS } from '@orts/backend/contracts';
import { AlertTriangle, History } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AutosaveIndicator } from '@/components/ui/autosave-indicator';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog } from '@/components/ui/dialog';
import { TextArea, TextField } from '@/components/ui/field';
import { maskPhone, PhoneField } from '@/components/ui/phone-field';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useAvailability, useCreateAppointment, useServices, useSettings, useUpdateAppointment } from '@/hooks/admin/queries';
import { useAutosave } from '@/hooks/use-autosave';
import { ApiError } from '@/lib/api';
import { addDays, formatDurationLabel, nowMinutes, todayISO } from '@/lib/format';
import { ServiceDot } from './status';
import { isWarningState, TimeSlots } from './time-slots';

export type FormPrefill = { date?: string; startTime?: string };

const DURATIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 420, 480];

/** Horários de término (de 30 em 30 minutos) para atendimentos de vários dias. */
const END_TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

/** Minutos entre dois horários locais (o Brasil não tem horário de verão). */
function minutesBetween(date: string, time: string, endDate: string, endTime: string): number {
  const at = (d: string, t: string) => {
    const [y, m, day] = d.split('-').map(Number) as [number, number, number];
    const [hh, mm] = t.split(':').map(Number) as [number, number];
    return Date.UTC(y, m - 1, day, hh, mm);
  };
  return Math.round((at(endDate, endTime) - at(date, time)) / 60000);
}

/** "AAAA-MM-DDTHH:MM" de um horário local somado a uma duração. */
function stampAfter(date: string, time: string, minutes: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, d, hh, mm + minutes)).toISOString().slice(0, 16);
}

/** Agora, no mesmo formato e no fuso da empresa. */
function nowStamp(): string {
  const m = nowMinutes();
  return `${todayISO()}T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

type Fields = {
  clientName: string;
  clientPhone: string;
  serviceTypeId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  address: string;
  neighborhood: string;
  city: string;
  notes: string;
  status: AppointmentStatus;
};

function initialFields(appointment?: AppointmentDTO, prefill?: FormPrefill): Fields {
  if (appointment) {
    return {
      clientName: appointment.clientName,
      clientPhone: maskPhone(appointment.clientPhone ?? ''),
      serviceTypeId: appointment.serviceType.id,
      date: appointment.date,
      startTime: appointment.startTime,
      durationMinutes: appointment.durationMinutes,
      address: appointment.address ?? '',
      neighborhood: appointment.neighborhood ?? '',
      city: appointment.city ?? '',
      notes: appointment.notes ?? '',
      status: appointment.status,
    };
  }
  return {
    clientName: '',
    clientPhone: '',
    serviceTypeId: '',
    date: prefill?.date ?? todayISO(),
    startTime: prefill?.startTime ?? '',
    durationMinutes: 0,
    address: '',
    neighborhood: '',
    city: 'Jaraguá do Sul',
    notes: '',
    status: 'pending',
  };
}

const toPayload = (f: Fields, allowOutsideHours: boolean) => ({ ...f, notes: f.notes.trim() || null, allowOutsideHours });
type Payload = ReturnType<typeof toPayload>;

function validateAppointment(payload: Payload): Record<string, string> {
  const parsed = appointmentCreateSchema.safeParse(payload);
  if (parsed.success) return {};
  const found: Record<string, string> = {};
  for (const issue of parsed.error.issues) found[String(issue.path[0] ?? '_')] ??= issue.message;
  return found;
}

/**
 * Cadastro e edição de atendimentos, com validação compartilhada com o backend.
 * Criar é uma ação explícita; na edição, cada alteração válida é salva sozinha.
 */
export function AppointmentForm({
  open,
  onOpenChange,
  appointment,
  prefill,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: AppointmentDTO;
  prefill?: FormPrefill;
  onSaved?: (appointment: AppointmentDTO) => void;
}) {
  const editing = Boolean(appointment);
  const services = useServices();
  const settings = useSettings();
  const create = useCreateAppointment();
  const update = useUpdateAppointment();

  const [f, setF] = useState<Fields>(() => initialFields(appointment, prefill));
  const [errors, setErrors] = useState<Record<string, string>>({});
  // no cadastro, o status acompanha o horário até ser escolhido à mão (serviço já feito = concluído)
  const [statusTouched, setStatusTouched] = useState(editing);
  // termina em outro dia: a duração passa a vir da data e do horário de término
  const [multiDay, setMultiDay] = useState(() => Boolean(appointment && isMultiDay(appointment)));
  const [end, setEnd] = useState(() =>
    appointment && isMultiDay(appointment)
      ? { date: appointment.endDate, time: appointment.endTime }
      : { date: addDays(prefill?.date ?? todayISO(), 1), time: prefill?.startTime ?? '12:00' },
  );
  const [allowOutside, setAllowOutside] = useState(false);
  const [violations, setViolations] = useState<ScheduleViolation[] | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();
  const lastSaved = useRef<AppointmentDTO | null>(null);
  const [initialPayload] = useState(() => toPayload(initialFields(appointment, prefill), false));

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setF((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (key === 'date' || key === 'startTime' || key === 'durationMinutes') {
      setConflict(null);
      setViolations(null);
    }
  };

  useEffect(() => {
    if (!multiDay || !f.startTime) return;
    const minutes = minutesBetween(f.date, f.startTime, end.date, end.time);
    setF((prev) => (prev.durationMinutes === minutes ? prev : { ...prev, durationMinutes: minutes }));
    setConflict(null);
    setViolations(null);
  }, [multiDay, f.date, f.startTime, end.date, end.time]);

  function toggleMultiDay(on: boolean) {
    setMultiDay(on);
    if (on) setEnd({ date: addDays(f.date, 1), time: f.startTime || '12:00' });
    else set('durationMinutes', settings.data?.defaultDurationMinutes ?? 90);
  }

  // duração inicial: a padrão da agenda (o serviço não define a duração)
  const defaultDuration = settings.data?.defaultDurationMinutes;
  useEffect(() => {
    if (multiDay || !defaultDuration) return;
    setF((prev) => (prev.durationMinutes ? prev : { ...prev, durationMinutes: defaultDuration }));
  }, [defaultDuration, multiDay]);

  // horário que já passou: registro de um serviço já feito
  const now = nowStamp();
  const startsInPast = Boolean(f.startTime) && `${f.date}T${f.startTime}` < now;
  const suggestedStatus: AppointmentStatus = !startsInPast
    ? 'pending'
    : f.durationMinutes && stampAfter(f.date, f.startTime, f.durationMinutes) <= now
      ? 'completed'
      : 'in_progress';
  useEffect(() => {
    if (statusTouched) return;
    setF((prev) => (prev.status === suggestedStatus ? prev : { ...prev, status: suggestedStatus }));
  }, [statusTouched, suggestedStatus]);

  // no modo de vários dias a grade mostra só se o horário de início está livre
  const availability = useAvailability(open ? f.date : null, multiDay ? 30 : f.durationMinutes || 60, appointment?.id);
  const slotState = availability.data?.slots.find((s) => s.time === f.startTime)?.state;
  const keepTime = editing && appointment?.date === f.date ? appointment.startTime : undefined;
  const timeUnchanged = editing && appointment?.date === f.date && appointment?.startTime === f.startTime && appointment?.durationMinutes === f.durationMinutes;
  const needsOverride = !timeUnchanged && (isWarningState(slotState) || (availability.data && !availability.data.open) || Boolean(violations?.length));

  const autosave = useAutosave<Payload>({
    value: toPayload(f, allowOutside),
    initial: initialPayload,
    enabled: editing && open,
    delay: 800,
    validate: (payload) => {
      const found = validateAppointment(payload);
      if (!Object.keys(found).length && needsOverride && !payload.allowOutsideHours) {
        found.startTime = 'Horário fora das regras da agenda: ative “Registrar como encaixe” para usá-lo.';
      }
      return found;
    },
    save: async (payload) => {
      if (!appointment) return;
      setConflict(null);
      try {
        lastSaved.current = await update.mutateAsync({ id: appointment.id, input: payload });
        setViolations(null);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'OUTSIDE_SCHEDULE') {
          setViolations((err.details as { violations?: ScheduleViolation[] })?.violations ?? [{ code: 'OUTSIDE_HOURS', message: err.message }]);
        } else if (err instanceof ApiError && err.code === 'SCHEDULE_CONFLICT') {
          setConflict(err.message);
        }
        throw err;
      }
    },
  });
  const shownErrors = editing ? { ...errors, ...autosave.errors } : errors;
  const endError = !multiDay
    ? undefined
    : f.startTime && f.durationMinutes < 15
      ? 'O término precisa ser depois do início.'
      : f.durationMinutes > MAX_APPOINTMENT_MINUTES
        ? 'Um atendimento pode durar até 14 dias.'
        : shownErrors.durationMinutes;

  /** Fecha a edição salvando o que estiver pendente; se algo não pôde ser salvo, pergunta antes. */
  async function closeEditing() {
    const outcome = await autosave.flush();
    if (outcome === 'invalid' || outcome === 'error') {
      const ok = await confirm({
        title: 'Fechar sem salvar a última alteração?',
        description:
          outcome === 'invalid'
            ? 'Há um campo que precisa ser corrigido. O restante do atendimento já está salvo.'
            : 'A última alteração foi recusada (por exemplo, por conflito de horário). O restante já está salvo.',
        confirmLabel: 'Fechar sem salvar',
        cancelLabel: 'Continuar editando',
        tone: 'danger',
      });
      if (!ok) return;
    }
    onOpenChange(false);
    if (appointment) onSaved?.(lastSaved.current ?? appointment);
  }

  const serviceOptions = useMemo(
    () =>
      (services.data ?? [])
        .filter((s) => s.active || s.id === appointment?.serviceType.id)
        .map((s) => ({ value: s.id, label: s.name, leading: <ServiceDot color={s.color} /> })),
    [services.data, appointment?.serviceType.id],
  );

  const durationOptions = useMemo(() => {
    const values = new Set(DURATIONS);
    if (f.durationMinutes) values.add(f.durationMinutes);
    return [...values].sort((a, b) => a - b).map((m) => ({ value: String(m), label: formatDurationLabel(m) }));
  }, [f.durationMinutes]);

  const statusOptions = APPOINTMENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (editing) {
      void autosave.flush();
      return;
    }
    const payload = toPayload(f, allowOutside);
    const parsed = appointmentCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '_');
        next[key] ??= issue.message;
      }
      setErrors(next);
      toast.error('Revise os campos destacados.');
      if (next.clientName) nameRef.current?.focus();
      return;
    }
    setErrors({});
    setConflict(null);
    try {
      const saved = await create.mutateAsync(payload);
      toast.success(startsInPast ? 'Atendimento registrado.' : 'Atendimento agendado.', {
        description: `${saved.clientName} · ${saved.startTime}`,
      });
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      if (!(err instanceof ApiError)) return toast.error('Não foi possível salvar. Tente novamente.');
      if (err.code === 'VALIDATION_ERROR') {
        setErrors(err.fields);
        toast.error(err.message);
      } else if (err.code === 'OUTSIDE_SCHEDULE') {
        setViolations((err.details as { violations?: ScheduleViolation[] })?.violations ?? [{ code: 'OUTSIDE_HOURS', message: err.message }]);
      } else if (err.code === 'SCHEDULE_CONFLICT') {
        setConflict(err.message);
      } else {
        toast.error(err.message);
      }
    }
  }

  const saving = create.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (editing && !next ? void closeEditing() : onOpenChange(next))}
      size="lg"
      title={editing ? 'Editar atendimento' : 'Novo agendamento'}
      description={
        editing
          ? 'As alterações são salvas automaticamente. Conflitos de horário são verificados na hora.'
          : 'Nome, serviço e horário bastam. Telefone e endereço podem ser completados depois.'
      }
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        nameRef.current?.focus();
      }}
      footer={
        editing ? (
          <>
            <AutosaveIndicator status={autosave.status} message={autosave.message} onRetry={() => void autosave.retry()} className="mr-auto" />
            <Button variant="dark" onClick={() => void closeEditing()}>
              Concluir
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="appointment-form" variant="dark" loading={saving}>
              {startsInPast ? 'Registrar atendimento' : 'Agendar atendimento'}
            </Button>
          </>
        )
      }
    >
      <form id="appointment-form" onSubmit={onSubmit} noValidate autoComplete="off" className="flex flex-col gap-7">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Cliente</legend>
          <TextField ref={nameRef} label="Nome do cliente" value={f.clientName} onChange={(e) => set('clientName', e.target.value)} error={shownErrors.clientName} maxLength={120} />
          <PhoneField label="Telefone / WhatsApp" optional value={f.clientPhone} onChange={(v) => set('clientPhone', v)} error={shownErrors.clientPhone} />
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Serviço</legend>
          <Select
            label="Tipo de serviço"
            value={f.serviceTypeId}
            onChange={(v) => set('serviceTypeId', v)}
            options={serviceOptions}
            placeholder={services.isLoading ? 'Carregando…' : 'Escolha o serviço'}
            error={shownErrors.serviceTypeId}
          />
          <Select
            label="Status"
            value={f.status}
            onChange={(v) => {
              setStatusTouched(true);
              set('status', v as AppointmentStatus);
            }}
            options={statusOptions}
            hint={!statusTouched && startsInPast ? 'Escolhido pelo horário, que já passou.' : undefined}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Quando</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <DatePicker label={multiDay ? 'Data de início' : 'Data'} value={f.date} onChange={(d) => set('date', d)} error={shownErrors.date} />
            {multiDay ? (
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="text-[13px] font-semibold text-ink-soft">Duração total</p>
                <p className="tabular flex h-11 items-center rounded-md border border-dashed border-line-strong px-3.5 text-[15px] text-ink" aria-live="polite">
                  {f.startTime && f.durationMinutes >= 15 ? formatDurationLabel(f.durationMinutes) : <span className="text-subtle">Escolha o início e o término</span>}
                </p>
              </div>
            ) : (
              <Select
                label="Duração"
                value={f.durationMinutes ? String(f.durationMinutes) : ''}
                onChange={(v) => set('durationMinutes', Number(v))}
                options={durationOptions}
                error={shownErrors.durationMinutes}
                hint={availability.data?.bufferMinutes ? `Intervalo de ${formatDurationLabel(availability.data.bufferMinutes)} entre atendimentos.` : undefined}
              />
            )}
          </div>
          <Switch
            checked={multiDay}
            onCheckedChange={toggleMultiDay}
            label="Termina em outro dia"
            description="Para serviços que continuam no dia seguinte ou levam vários dias."
          />
          {multiDay && (
            <div className="grid gap-4 sm:grid-cols-2">
              <DatePicker label="Data do término" value={end.date} min={f.date} onChange={(d) => setEnd((prev) => ({ ...prev, date: d }))} error={endError} />
              <Select
                label="Horário do término"
                value={end.time}
                onChange={(v) => setEnd((prev) => ({ ...prev, time: v }))}
                options={(END_TIMES.includes(end.time) ? END_TIMES : [...END_TIMES, end.time].sort()).map((t) => ({ value: t, label: t }))}
              />
            </div>
          )}
          <TimeSlots
            availability={availability.data}
            loading={availability.isLoading}
            value={f.startTime}
            onChange={(t) => set('startTime', t)}
            keepTime={keepTime}
            error={shownErrors.startTime}
          />
          {startsInPast && !editing && (
            <p className="flex gap-2.5 rounded-md border border-steel-500/25 bg-steel-100/70 px-3.5 py-2.5 text-[13px] leading-snug text-ink-soft">
              <History className="mt-0.5 size-4 shrink-0 text-steel-600" aria-hidden="true" />
              <span>Esse horário já passou: o atendimento entra no histórico, como um serviço já feito.</span>
            </p>
          )}
          {conflict && (
            <div role="alert" className="flex gap-3 rounded-md border border-danger/25 bg-danger-bg px-4 py-3 text-[14px] leading-snug text-[#7f2f25]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{conflict} Escolha outro horário.</span>
            </div>
          )}
          {needsOverride && (
            <div className="rounded-md border border-status-pending/35 bg-status-pending-bg/70 p-4">
              <div className="flex gap-3 text-[14px] leading-snug text-status-pending-fg">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Horário fora das regras da agenda</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {(violations?.length
                      ? violations.map((v) => v.message)
                      : [slotState === 'too_soon' ? 'Abaixo da antecedência mínima configurada.' : slotState === 'break' ? 'Coincide com uma pausa configurada.' : 'Fora do horário de atendimento.']
                    ).map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <Switch
                className="mt-4"
                checked={allowOutside}
                onCheckedChange={setAllowOutside}
                label="Registrar como encaixe"
                description="Conflitos com outros atendimentos continuam bloqueados."
              />
            </div>
          )}
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Onde</legend>
          <TextField
            label="Endereço"
            optional
            placeholder="Rua, número e complemento"
            value={f.address}
            onChange={(e) => set('address', e.target.value)}
            error={shownErrors.address}
            containerClassName="sm:col-span-2"
            maxLength={200}
          />
          <TextField label="Bairro" optional value={f.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} error={shownErrors.neighborhood} maxLength={80} />
          <TextField label="Cidade" optional value={f.city} onChange={(e) => set('city', e.target.value)} error={shownErrors.city} maxLength={80} />
        </fieldset>

        <TextArea
          label="Observações"
          optional
          placeholder="Modelo do aparelho, acesso ao local, materiais…"
          value={f.notes}
          onChange={(e) => set('notes', e.target.value)}
          error={shownErrors.notes}
          maxLength={2000}
        />
      </form>
    </Dialog>
  );
}
