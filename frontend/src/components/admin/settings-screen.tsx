'use client';

import type { BreakWindow, DayHours, ServiceColor, ServiceTypeDTO, SettingsDTO, SettingsInput } from '@orts/backend/contracts';
import { PASSWORD_MIN_LENGTH, SERVICE_COLORS, settingsInputSchema, SLOT_INTERVALS, TEMPLATE_VARIABLES, WEEKDAY_LABELS } from '@orts/backend/contracts';
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { Tabs } from 'radix-ui';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { TextArea, TextField } from '@/components/ui/field';
import { maskPhone, PhoneField } from '@/components/ui/phone-field';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useChangePassword, useSaveService, useSaveSettings, useServices, useSettings } from '@/hooks/admin/queries';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDurationLabel, timeOf } from '@/lib/format';
import { PageHeader } from './shell';
import { SERVICE_COLOR, SERVICE_COLOR_LABEL, ServiceDot } from './status';

const TIME_OPTIONS = Array.from({ length: 38 }, (_, i) => timeOf(5 * 60 + i * 30)).map((t) => ({ value: t, label: t }));
const DURATIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480].map((m) => ({ value: String(m), label: formatDurationLabel(m) }));
const BUFFERS = [0, 15, 30, 45, 60, 90, 120].map((m) => ({ value: String(m), label: m === 0 ? 'Sem intervalo' : formatDurationLabel(m) }));
const ADVANCE = [
  [0, 'Sem antecedência'],
  [30, '30 minutos'],
  [60, '1 hora'],
  [120, '2 horas'],
  [240, '4 horas'],
  [720, '12 horas'],
  [1440, '1 dia'],
  [2880, '2 dias'],
].map(([v, l]) => ({ value: String(v), label: String(l) }));
const INTERVALS = SLOT_INTERVALS.map((m) => ({ value: String(m), label: `A cada ${m} min` }));
const ORDER = [1, 2, 3, 4, 5, 6, 0];

type Form = Omit<SettingsDTO, 'timezone' | 'updatedAt'>;

const toForm = (s: SettingsDTO): Form => ({
  weeklyHours: s.weeklyHours,
  breaks: s.breaks,
  defaultDurationMinutes: s.defaultDurationMinutes,
  bufferMinutes: s.bufferMinutes,
  minAdvanceMinutes: s.minAdvanceMinutes,
  slotIntervalMinutes: s.slotIntervalMinutes,
  businessName: s.businessName,
  businessPhone: s.businessPhone ? maskPhone(s.businessPhone) : null,
  businessWhatsapp: s.businessWhatsapp ? maskPhone(s.businessWhatsapp) : null,
  businessEmail: s.businessEmail,
  businessAddress: s.businessAddress,
  serviceArea: s.serviceArea,
  instagramUrl: s.instagramUrl,
  showHoursOnSite: s.showHoursOnSite,
  confirmationTemplate: s.confirmationTemplate,
});

export function SettingsScreen() {
  const settings = useSettings();
  return (
    <>
      <PageHeader title="Configurações" subtitle="Horários, regras da agenda, serviços e dados exibidos no site." />
      <div className="px-4 sm:px-6 lg:px-10">{settings.data ? <SettingsTabs settings={settings.data} /> : <Skeleton className="h-96" />}</div>
    </>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-paper">
      <div className="border-b border-line px-4 py-4 sm:px-6">
        <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[14px] leading-relaxed text-muted">{description}</p>}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

function SettingsTabs({ settings }: { settings: SettingsDTO }) {
  const save = useSaveSettings();
  const initial = useMemo(() => toForm(settings), [settings]);
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState('expediente');
  useEffect(() => setForm(initial), [initial]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const patch = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));
  const setDay = (weekday: number, p: Partial<DayHours>) => patch({ weeklyHours: form.weeklyHours.map((d) => (d.weekday === weekday ? { ...d, ...p } : d)) });
  const setBreak = (i: number, p: Partial<BreakWindow>) => patch({ breaks: form.breaks.map((b, j) => (j === i ? { ...b, ...p } : b)) });

  async function onSave(e?: FormEvent) {
    e?.preventDefault();
    const payload: SettingsInput = form;
    const parsed = settingsInputSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join('.')] ??= issue.message;
      setErrors(next);
      toast.error('Revise os campos destacados.', { description: Object.values(next)[0] });
      return;
    }
    setErrors({});
    try {
      await save.mutateAsync(payload);
      toast.success('Configurações salvas.', { description: 'As regras já valem para novos agendamentos.' });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    }
  }

  const tabs = [
    { value: 'expediente', label: 'Expediente' },
    { value: 'regras', label: 'Regras' },
    { value: 'servicos', label: 'Serviços' },
    { value: 'site', label: 'Dados do site' },
    { value: 'acesso', label: 'Acesso' },
  ];

  return (
    <Tabs.Root value={tab} onValueChange={setTab}>
      <Tabs.List aria-label="Seções das configurações" className="scrollbar-none -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <Tabs.Trigger
            key={t.value}
            value={t.value}
            className="relative h-11 shrink-0 px-3 text-[14px] font-semibold text-muted transition-colors hover:text-ink data-[state=active]:text-ink data-[state=active]:after:absolute data-[state=active]:after:inset-x-3 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-champagne-600"
          >
            {t.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <form onSubmit={onSave} noValidate autoComplete="off">
        <Tabs.Content value="expediente" className="flex flex-col gap-5 outline-none">
          <Section title="Horário de atendimento" description="Dias e horários em que a agenda aceita atendimentos.">
            <ul className="divide-y divide-line">
              {ORDER.map((weekday) => {
                const day = form.weeklyHours.find((d) => d.weekday === weekday)!;
                const idx = form.weeklyHours.indexOf(day);
                return (
                  <li key={weekday} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 sm:grid-cols-[180px_1fr]">
                    <Switch checked={day.enabled} onCheckedChange={(v) => setDay(weekday, { enabled: v })} label={WEEKDAY_LABELS[weekday]!} />
                    <div className={cn('col-span-2 grid grid-cols-2 gap-3 sm:col-span-1 sm:max-w-sm', !day.enabled && 'pointer-events-none opacity-40')} aria-disabled={!day.enabled}>
                      <Select label={`Início (${WEEKDAY_LABELS[weekday]})`} hideLabel size="sm" value={day.start} onChange={(v) => setDay(weekday, { start: v })} options={TIME_OPTIONS} disabled={!day.enabled} />
                      <Select
                        label={`Término (${WEEKDAY_LABELS[weekday]})`}
                        hideLabel
                        size="sm"
                        value={day.end}
                        onChange={(v) => setDay(weekday, { end: v })}
                        options={TIME_OPTIONS}
                        disabled={!day.enabled}
                        error={errors[`weeklyHours.${idx}.end`]}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
          <Section title="Pausas" description="Intervalos sem atendimento em todos os dias (ex.: almoço).">
            <div className="flex flex-col gap-3">
              {form.breaks.map((b, i) => (
                <div key={i} className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_140px_140px_auto]">
                  <TextField label="Nome da pausa" value={b.label} onChange={(e) => setBreak(i, { label: e.target.value })} containerClassName="col-span-2 sm:col-span-1" maxLength={40} />
                  <Select label="Início" value={b.start} onChange={(v) => setBreak(i, { start: v })} options={TIME_OPTIONS} />
                  <Select label="Término" value={b.end} onChange={(v) => setBreak(i, { end: v })} options={TIME_OPTIONS} error={errors[`breaks.${i}.end`]} />
                  <Button variant="danger-ghost" size="icon" onClick={() => patch({ breaks: form.breaks.filter((_, j) => j !== i) })} aria-label={`Remover pausa ${b.label}`} className="col-span-2 w-full sm:col-span-1 sm:w-11">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              {form.breaks.length < 6 && (
                <Button variant="secondary" className="self-start" onClick={() => patch({ breaks: [...form.breaks, { start: '12:00', end: '13:00', label: 'Pausa' }] })}>
                  <Plus className="size-4" aria-hidden="true" /> Adicionar pausa
                </Button>
              )}
            </div>
          </Section>
        </Tabs.Content>

        <Tabs.Content value="regras" className="flex flex-col gap-5 outline-none">
          <Section title="Regras da agenda" description="Usadas na validação de novos agendamentos e remarcações.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Select
                label="Duração padrão do atendimento"
                value={String(form.defaultDurationMinutes)}
                onChange={(v) => patch({ defaultDurationMinutes: Number(v) })}
                options={DURATIONS}
                hint="Usada quando o serviço não define outra duração."
              />
              <Select
                label="Intervalo entre atendimentos"
                value={String(form.bufferMinutes)}
                onChange={(v) => patch({ bufferMinutes: Number(v) })}
                options={BUFFERS}
                hint="Tempo reservado para deslocamento entre clientes."
              />
              <Select
                label="Antecedência mínima"
                value={String(form.minAdvanceMinutes)}
                onChange={(v) => patch({ minAdvanceMinutes: Number(v) })}
                options={ADVANCE}
                hint="Horários mais próximos que isso exigem confirmação de encaixe."
              />
              <Select label="Grade de horários" value={String(form.slotIntervalMinutes)} onChange={(v) => patch({ slotIntervalMinutes: Number(v) })} options={INTERVALS} hint="De quanto em quanto tempo os horários aparecem." />
            </div>
          </Section>
        </Tabs.Content>

        <Tabs.Content value="site" className="flex flex-col gap-5 outline-none">
          <Section title="Dados comerciais" description="Aparecem no site institucional e nas mensagens de confirmação.">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Nome da empresa" value={form.businessName} onChange={(e) => patch({ businessName: e.target.value })} error={errors.businessName} maxLength={80} />
              <TextField label="E-mail" optional inputMode="email" value={form.businessEmail ?? ''} onChange={(e) => patch({ businessEmail: e.target.value || null })} error={errors.businessEmail} maxLength={160} />
              <PhoneField label="WhatsApp" optional value={form.businessWhatsapp ?? ''} onChange={(v) => patch({ businessWhatsapp: v || null })} error={errors.businessWhatsapp} hint="Principal canal de contato do site." />
              <PhoneField label="Telefone" optional value={form.businessPhone ?? ''} onChange={(v) => patch({ businessPhone: v || null })} error={errors.businessPhone} />
              <TextField label="Endereço" optional value={form.businessAddress ?? ''} onChange={(e) => patch({ businessAddress: e.target.value || null })} error={errors.businessAddress} hint="Ex.: Vila Nova, Jaraguá do Sul - SC" maxLength={200} />
              <TextField label="Instagram" optional placeholder="https://instagram.com/..." value={form.instagramUrl ?? ''} onChange={(e) => patch({ instagramUrl: e.target.value || null })} error={errors.instagramUrl} maxLength={200} />
              <TextArea
                label="Texto da área de atendimento"
                optional
                rows={2}
                value={form.serviceArea ?? ''}
                onChange={(e) => patch({ serviceArea: e.target.value || null })}
                error={errors.serviceArea}
                containerClassName="sm:col-span-2"
                maxLength={200}
                placeholder="Ex.: Atendemos Jaraguá do Sul e cidades vizinhas."
              />
              <Switch
                className="sm:col-span-2"
                checked={form.showHoursOnSite}
                onCheckedChange={(v) => patch({ showHoursOnSite: v })}
                label="Mostrar horário de atendimento no site"
                description="Usa os dias e horários da aba Expediente."
              />
            </div>
          </Section>
          <Section title="Mensagem de confirmação" description="Enviada pelo botão de WhatsApp nos detalhes do atendimento.">
            <TextArea
              label="Modelo da mensagem"
              rows={4}
              value={form.confirmationTemplate}
              onChange={(e) => patch({ confirmationTemplate: e.target.value })}
              error={errors.confirmationTemplate}
              maxLength={800}
            />
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[12px] text-muted">Inserir:</span>
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => patch({ confirmationTemplate: `${form.confirmationTemplate.trimEnd()} ${v}`.slice(0, 800) })}
                  className="h-8 rounded-full border border-line-strong px-2.5 font-mono text-[12px] text-ink-soft hover:border-navy-700 hover:text-ink"
                >
                  {v}
                </button>
              ))}
            </div>
          </Section>
        </Tabs.Content>

        {dirty && (tab === 'expediente' || tab === 'regras' || tab === 'site') && (
          <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 mt-5 flex items-center justify-between gap-3 rounded-lg border border-line bg-paper/95 p-3 shadow-lift backdrop-blur animate-pop-in lg:bottom-4">
            <p className="pl-1 text-[13px] font-medium text-ink-soft" aria-live="polite">
              Alterações não salvas
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setForm(initial)}>
                Descartar
              </Button>
              <Button type="submit" variant="dark" loading={save.isPending}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </form>

      <Tabs.Content value="servicos" className="outline-none">
        <ServicesManager />
      </Tabs.Content>
      <Tabs.Content value="acesso" className="outline-none">
        <PasswordForm />
      </Tabs.Content>
    </Tabs.Root>
  );
}

function ServicesManager() {
  const services = useServices();
  const [editing, setEditing] = useState<ServiceTypeDTO | 'new' | null>(null);
  return (
    <Section title="Serviços" description="Tipos de atendimento e a duração usada como padrão na agenda.">
      {services.isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <ul className="divide-y divide-line">
          {services.data?.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <ServiceDot color={s.color} className="size-3" />
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-[15px] font-semibold', s.active ? 'text-ink' : 'text-subtle line-through')}>{s.name}</p>
                <p className="text-[13px] text-muted">
                  {formatDurationLabel(s.durationMinutes)}
                  {!s.active && ' · desativado'}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(s)} aria-label={`Editar ${s.name}`}>
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" className="mt-4" onClick={() => setEditing('new')}>
        <Plus className="size-4" aria-hidden="true" /> Novo serviço
      </Button>
      {editing && <ServiceDialog service={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </Section>
  );
}

function ServiceDialog({ service, onClose }: { service?: ServiceTypeDTO; onClose: () => void }) {
  const save = useSaveService();
  const [name, setName] = useState(service?.name ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [duration, setDuration] = useState(String(service?.durationMinutes ?? 90));
  const [color, setColor] = useState<ServiceColor>(service?.color ?? 'slate');
  const [active, setActive] = useState(service?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErrors({ name: 'Informe o nome do serviço.' });
    try {
      await save.mutateAsync({ id: service?.id, input: { name: name.trim(), description: description.trim() || null, durationMinutes: Number(duration), color, active } });
      toast.success(service ? 'Serviço atualizado.' : 'Serviço criado.');
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.code === 'DUPLICATE' ? { name: 'Já existe um serviço com esse nome.' } : err.fields);
        if (err.code !== 'DUPLICATE') toast.error(err.message);
      }
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={service ? 'Editar serviço' : 'Novo serviço'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="service-form" variant="dark" loading={save.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={submit} noValidate autoComplete="off" className="flex flex-col gap-5">
        <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={80} />
        <TextArea label="Descrição" optional rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
        <Select label="Duração padrão" value={duration} onChange={setDuration} options={DURATIONS} />
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-ink-soft">Cor na agenda</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor na agenda">
            {SERVICE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={SERVICE_COLOR_LABEL[c]}
                title={SERVICE_COLOR_LABEL[c]}
                onClick={() => setColor(c)}
                className={cn('size-10 rounded-md ring-offset-2 ring-offset-paper transition-shadow', SERVICE_COLOR[c], color === c && 'ring-2 ring-champagne-500')}
              />
            ))}
          </div>
        </fieldset>
        <Switch checked={active} onCheckedChange={setActive} label="Disponível para novos agendamentos" />
      </form>
    </Dialog>
  );
}

function PasswordForm() {
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!current) errs.currentPassword = 'Informe a senha atual.';
    if (next.length < PASSWORD_MIN_LENGTH) errs.newPassword = `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    if (confirmValue !== next) errs.confirm = 'As senhas não conferem.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await change.mutateAsync({ currentPassword: current, newPassword: next });
      toast.success('Senha alterada.', { description: 'Outras sessões abertas foram encerradas.' });
      setCurrent('');
      setNext('');
      setConfirmValue('');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        if (!Object.keys(err.fields).length) toast.error(err.message);
      }
    }
  }

  return (
    <Section title="Senha de acesso" description="Troque a senha do painel. As outras sessões abertas serão encerradas.">
      <form onSubmit={submit} noValidate autoComplete="off" className="flex max-w-md flex-col gap-5">
        <TextField label="Senha atual" type="password" icon={<KeyRound />} value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.currentPassword} />
        <TextField label="Nova senha" type="password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.newPassword} hint="Prefira uma frase longa, com letras, números e símbolos." />
        <TextField label="Confirme a nova senha" type="password" value={confirmValue} onChange={(e) => setConfirmValue(e.target.value)} error={errors.confirm} />
        <Button type="submit" variant="dark" loading={change.isPending} className="self-start">
          Alterar senha
        </Button>
      </form>
    </Section>
  );
}
