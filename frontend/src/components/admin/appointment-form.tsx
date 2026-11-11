'use client';

import type { AppointmentDTO, AppointmentStatus, ScheduleViolation } from '@orts/backend/contracts';
import { appointmentCreateSchema, APPOINTMENT_STATUSES, STATUS_LABELS } from '@orts/backend/contracts';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog } from '@/components/ui/dialog';
import { TextArea, TextField } from '@/components/ui/field';
import { maskPhone, PhoneField } from '@/components/ui/phone-field';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useAvailability, useCreateAppointment, useServices, useSettings, useUpdateAppointment } from '@/hooks/admin/queries';
import { ApiError } from '@/lib/api';
import { formatDurationLabel, todayISO } from '@/lib/format';
import { ServiceDot } from './status';
import { isWarningState, TimeSlots } from './time-slots';

export type FormPrefill = { date?: string; startTime?: string };

const DURATIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 420, 480];

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
      clientPhone: maskPhone(appointment.clientPhone),
      serviceTypeId: appointment.serviceType.id,
      date: appointment.date,
      startTime: appointment.startTime,
      durationMinutes: appointment.durationMinutes,
      address: appointment.address,
      neighborhood: appointment.neighborhood,
      city: appointment.city,
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

/** Cadastro e edição de atendimentos, com validação compartilhada com o backend. */
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
  const [durationTouched, setDurationTouched] = useState(editing);
  const [allowOutside, setAllowOutside] = useState(false);
  const [violations, setViolations] = useState<ScheduleViolation[] | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

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

  // duração padrão: do serviço escolhido ou da configuração da agenda
  useEffect(() => {
    if (durationTouched) return;
    const service = services.data?.find((s) => s.id === f.serviceTypeId);
    const fallback = settings.data?.defaultDurationMinutes ?? 90;
    setF((prev) => ({ ...prev, durationMinutes: service?.durationMinutes ?? (prev.durationMinutes || fallback) }));
  }, [f.serviceTypeId, services.data, settings.data, durationTouched]);

  const availability = useAvailability(open ? f.date : null, f.durationMinutes || 60, appointment?.id);
  const slotState = availability.data?.slots.find((s) => s.time === f.startTime)?.state;
  const keepTime = editing && appointment?.date === f.date ? appointment.startTime : undefined;
  const timeUnchanged = editing && appointment?.date === f.date && appointment?.startTime === f.startTime && appointment?.durationMinutes === f.durationMinutes;
  const needsOverride = !timeUnchanged && (isWarningState(slotState) || (availability.data && !availability.data.open) || Boolean(violations?.length));

  const serviceOptions = useMemo(
    () =>
      (services.data ?? [])
        .filter((s) => s.active || s.id === appointment?.serviceType.id)
        .map((s) => ({
          value: s.id,
          label: s.name,
          description: formatDurationLabel(s.durationMinutes),
          leading: <ServiceDot color={s.color} />,
        })),
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
    const payload = {
      ...f,
      notes: f.notes.trim() || null,
      allowOutsideHours: allowOutside,
    };
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
      const saved = editing && appointment
        ? await update.mutateAsync({ id: appointment.id, input: payload })
        : await create.mutateAsync(payload);
      toast.success(editing ? 'Alterações salvas.' : 'Atendimento agendado.', {
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
      onOpenChange={onOpenChange}
      size="lg"
      title={editing ? 'Editar atendimento' : 'Novo agendamento'}
      description={editing ? 'Altere os dados e salve. Conflitos de horário são verificados automaticamente.' : 'Preencha os dados do cliente e escolha um horário livre.'}
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        nameRef.current?.focus();
      }}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="appointment-form" variant="dark" loading={saving}>
            {editing ? 'Salvar alterações' : 'Agendar atendimento'}
          </Button>
        </>
      }
    >
      <form id="appointment-form" onSubmit={onSubmit} noValidate autoComplete="off" className="flex flex-col gap-7">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Cliente</legend>
          <TextField ref={nameRef} label="Nome do cliente" value={f.clientName} onChange={(e) => set('clientName', e.target.value)} error={errors.clientName} maxLength={120} />
          <PhoneField label="Telefone / WhatsApp" value={f.clientPhone} onChange={(v) => set('clientPhone', v)} error={errors.clientPhone} />
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Serviço</legend>
          <Select
            label="Tipo de serviço"
            value={f.serviceTypeId}
            onChange={(v) => set('serviceTypeId', v)}
            options={serviceOptions}
            placeholder={services.isLoading ? 'Carregando…' : 'Escolha o serviço'}
            error={errors.serviceTypeId}
          />
          <Select label="Status" value={f.status} onChange={(v) => set('status', v as AppointmentStatus)} options={statusOptions} />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Quando</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <DatePicker label="Data" value={f.date} onChange={(d) => set('date', d)} error={errors.date} />
            <Select
              label="Duração"
              value={f.durationMinutes ? String(f.durationMinutes) : ''}
              onChange={(v) => {
                setDurationTouched(true);
                set('durationMinutes', Number(v));
              }}
              options={durationOptions}
              error={errors.durationMinutes}
              hint={availability.data?.bufferMinutes ? `Intervalo de ${formatDurationLabel(availability.data.bufferMinutes)} entre atendimentos.` : undefined}
            />
          </div>
          <TimeSlots
            availability={availability.data}
            loading={availability.isLoading}
            value={f.startTime}
            onChange={(t) => set('startTime', t)}
            keepTime={keepTime}
            error={errors.startTime}
          />
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
            placeholder="Rua, número e complemento"
            value={f.address}
            onChange={(e) => set('address', e.target.value)}
            error={errors.address}
            containerClassName="sm:col-span-2"
            maxLength={200}
          />
          <TextField label="Bairro" value={f.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} error={errors.neighborhood} maxLength={80} />
          <TextField label="Cidade" value={f.city} onChange={(e) => set('city', e.target.value)} error={errors.city} maxLength={80} />
        </fieldset>

        <TextArea
          label="Observações"
          optional
          placeholder="Modelo do aparelho, acesso ao local, materiais…"
          value={f.notes}
          onChange={(e) => set('notes', e.target.value)}
          error={errors.notes}
          maxLength={2000}
        />
      </form>
    </Dialog>
  );
}
