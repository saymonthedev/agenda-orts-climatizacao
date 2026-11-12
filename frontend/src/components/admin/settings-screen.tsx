'use client';

import type { BreakWindow, DayHours, ServiceColor, ServiceTypeDTO, SettingsDTO, SettingsInput } from '@orts/backend/contracts';
import { MEI_DEFAULT_LIMIT_CENTS, PASSWORD_MIN_LENGTH, SERVICE_COLORS, settingsInputSchema, SLOT_INTERVALS, TEMPLATE_VARIABLES, WEEKDAY_LABELS } from '@orts/backend/contracts';
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { Tabs } from 'radix-ui';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AutosaveIndicator } from '@/components/ui/autosave-indicator';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { Dialog } from '@/components/ui/dialog';
import { TextArea, TextField } from '@/components/ui/field';
import { MoneyField } from '@/components/ui/money-field';
import { maskPhone, PhoneField } from '@/components/ui/phone-field';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useChangePassword, useSaveService, useSaveSettings, useServices, useSettings } from '@/hooks/admin/queries';
import { useAutosave } from '@/hooks/use-autosave';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDurationLabel, timeOf } from '@/lib/format';
import { formatBRL } from '@/lib/money';
import { FinanceCategoriesManager } from './finance-categories';
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
  meiAnnualLimitCents: s.meiAnnualLimitCents ?? null,
  confirmationTemplate: s.confirmationTemplate,
});

function validateSettings(value: Form): Record<string, string> {
  const parsed = settingsInputSchema.safeParse(value);
  if (parsed.success) return {};
  const found: Record<string, string> = {};
  for (const issue of parsed.error.issues) found[issue.path.join('.')] ??= issue.message;
  return found;
}

export function SettingsScreen() {
  const settings = useSettings();
  return (
    <>
      <PageHeader title="Configurações" subtitle="Horários, regras da agenda, serviços e dados do site. Tudo é salvo automaticamente." />
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
  const [initial] = useState(() => toForm(settings));
  const confirm = useConfirm();
  const [form, setForm] = useState<Form>(initial);
  const [tab, setTab] = useState('expediente');
  // permite abrir direto numa aba (ex.: /admin/configuracoes?aba=financeiro)
  useEffect(() => {
    const aba = new URLSearchParams(window.location.search).get('aba');
    if (aba) setTab(aba);
  }, []);
  // Salvamento automático: o formulário não é recarregado a cada resposta do servidor,
  // para não apagar o que a pessoa ainda está digitando.
  const autosave = useAutosave<Form>({
    value: form,
    initial,
    validate: validateSettings,
    save: (value: SettingsInput) => save.mutateAsync(value),
  });
  const errors = autosave.errors;

  const patch = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));
  const setDay = (weekday: number, p: Partial<DayHours>) =>
    setForm((f) => ({ ...f, weeklyHours: f.weeklyHours.map((d) => (d.weekday === weekday ? { ...d, ...p } : d)) }));
  const setBreak = (i: number, p: Partial<BreakWindow>) => setForm((f) => ({ ...f, breaks: f.breaks.map((b, j) => (j === i ? { ...b, ...p } : b)) }));

  async function removeBreak(i: number) {
    const b = form.breaks[i];
    if (!b) return;
    const ok = await confirm({
      title: `Remover a pausa “${b.label.trim() || 'sem nome'}”?`,
      description: `O intervalo das ${b.start} às ${b.end} volta a ficar livre na agenda.`,
      confirmLabel: 'Remover',
      tone: 'danger',
    });
    if (ok) setForm((f) => ({ ...f, breaks: f.breaks.filter((_, j) => j !== i) }));
  }

  const tabs = [
    { value: 'expediente', label: 'Expediente' },
    { value: 'regras', label: 'Regras' },
    { value: 'servicos', label: 'Serviços' },
    { value: 'financeiro', label: 'Financeiro' },
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
            className="relative h-11 shrink-0 px-3 text-[14px] font-semibold text-muted transition-colors hover:text-ink data-[state=active]:text-ink data-[state=active]:after:absolute data-[state=active]:after:inset-x-3 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-steel-500"
          >
            {t.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void autosave.flush();
        }}
        noValidate
        autoComplete="off"
      >
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
                <div
                  key={i}
                  className="grid grid-cols-2 items-end gap-3 rounded-md border border-line p-3 sm:grid-cols-[1fr_140px_140px_auto] sm:rounded-none sm:border-0 sm:p-0"
                >
                  {/* No celular: nome e lixeira na mesma linha; no computador, a lixeira vai para o fim da linha. */}
                  <div className="col-span-2 flex items-end gap-2 sm:contents">
                    <TextField label="Nome da pausa" value={b.label} onChange={(e) => setBreak(i, { label: e.target.value })} containerClassName="min-w-0 flex-1" maxLength={40} />
                    <Button
                      variant="danger-ghost"
                      size="icon"
                      onClick={() => void removeBreak(i)}
                      aria-label={`Remover pausa ${b.label}`}
                      title="Remover pausa"
                      className="shrink-0 sm:order-last"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <Select label="Início" value={b.start} onChange={(v) => setBreak(i, { start: v })} options={TIME_OPTIONS} />
                  <Select label="Término" value={b.end} onChange={(v) => setBreak(i, { end: v })} options={TIME_OPTIONS} error={errors[`breaks.${i}.end`]} />
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

        <Tabs.Content value="financeiro" className="flex flex-col gap-5 outline-none">
          <Section title="Limite do MEI" description="Mostra no Financeiro quanto já entrou no ano e quanto ainda pode faturar.">
            <div className="flex flex-col gap-5">
              <Switch
                checked={form.meiAnnualLimitCents != null}
                onCheckedChange={(on) => patch({ meiAnnualLimitCents: on ? MEI_DEFAULT_LIMIT_CENTS : null })}
                label="Acompanhar o limite anual do MEI"
                description="Ligue se a empresa for MEI."
              />
              {form.meiAnnualLimitCents != null && (
                <MoneyField
                  label="Limite anual"
                  value={form.meiAnnualLimitCents}
                  onChange={(v) => patch({ meiAnnualLimitCents: v ?? 0 })}
                  error={errors.meiAnnualLimitCents}
                  hint="Em 2026 o limite é R$ 81.000,00. A Lei Complementar 238/2026 sobe para R$ 110.000,00 em 2027."
                  containerClassName="max-w-xs"
                />
              )}
            </div>
          </Section>
          <FinanceCategoriesManager />
        </Tabs.Content>
      </form>
      <AutosaveIndicator variant="floating" status={autosave.status} message={autosave.message} onRetry={() => void autosave.retry()} />

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
                  {s.priceCents != null && ` · ${formatBRL(s.priceCents)}`}
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

type ServiceForm = { name: string; description: string; durationMinutes: number; color: ServiceColor; active: boolean; priceCents: number | null };

const serviceToForm = (s: ServiceTypeDTO): ServiceForm => ({
  name: s.name,
  description: s.description ?? '',
  durationMinutes: s.durationMinutes,
  color: s.color,
  active: s.active,
  priceCents: s.priceCents,
});
const serviceInput = (v: ServiceForm) => ({
  name: v.name.trim(),
  description: v.description.trim() || null,
  durationMinutes: v.durationMinutes,
  color: v.color,
  active: v.active,
  priceCents: v.priceCents,
});
const validateService = (v: ServiceForm): Record<string, string> => (v.name.trim().length < 2 ? { name: 'Informe o nome do serviço.' } : {});

function ServiceDialog({ service, onClose }: { service?: ServiceTypeDTO; onClose: () => void }) {
  return service ? <EditServiceDialog service={service} onClose={onClose} /> : <NewServiceDialog onClose={onClose} />;
}

function ServiceFields({ value, onChange, errors }: { value: ServiceForm; onChange: (p: Partial<ServiceForm>) => void; errors: Record<string, string> }) {
  return (
    <>
      <TextField label="Nome" value={value.name} onChange={(e) => onChange({ name: e.target.value })} error={errors.name} maxLength={80} />
      <TextArea label="Descrição" optional rows={2} value={value.description} onChange={(e) => onChange({ description: e.target.value })} maxLength={200} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Duração padrão" value={String(value.durationMinutes)} onChange={(v) => onChange({ durationMinutes: Number(v) })} options={DURATIONS} />
        <MoneyField label="Preço sugerido" optional value={value.priceCents} onChange={(priceCents) => onChange({ priceCents })} hint="Já vem preenchido ao registrar o pagamento." />
      </div>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ink-soft">Cor na agenda</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor na agenda">
          {SERVICE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={value.color === c}
              aria-label={SERVICE_COLOR_LABEL[c]}
              title={SERVICE_COLOR_LABEL[c]}
              onClick={() => onChange({ color: c })}
              className={cn('size-10 rounded-md ring-offset-2 ring-offset-paper transition-shadow', SERVICE_COLOR[c], value.color === c && 'ring-2 ring-steel-500')}
            />
          ))}
        </div>
      </fieldset>
      <Switch checked={value.active} onCheckedChange={(v) => onChange({ active: v })} label="Disponível para novos agendamentos" />
    </>
  );
}

/** Criar é uma ação explícita: o serviço só passa a existir ao confirmar. */
function NewServiceDialog({ onClose }: { onClose: () => void }) {
  const save = useSaveService();
  const [value, setValue] = useState<ServiceForm>({ name: '', description: '', durationMinutes: 90, color: 'slate', active: true, priceCents: null });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validateService(value);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await save.mutateAsync({ input: serviceInput(value) });
      toast.success('Serviço criado.');
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
      title="Novo serviço"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="service-form" variant="dark" loading={save.isPending}>
            Criar serviço
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={submit} noValidate autoComplete="off" className="flex flex-col gap-5">
        <ServiceFields value={value} onChange={(p) => setValue((v) => ({ ...v, ...p }))} errors={errors} />
      </form>
    </Dialog>
  );
}

/** Editar salva sozinho; fechar a janela envia o que estiver pendente. */
function EditServiceDialog({ service, onClose }: { service: ServiceTypeDTO; onClose: () => void }) {
  const save = useSaveService();
  const [initial] = useState(() => serviceToForm(service));
  const [value, setValue] = useState(initial);
  const autosave = useAutosave<ServiceForm>({
    value,
    initial,
    validate: validateService,
    save: (v) => save.mutateAsync({ id: service.id, input: serviceInput(v) }),
  });
  const errors = autosave.status === 'error' && autosave.message?.toLowerCase().includes('já existe') ? { ...autosave.errors, name: 'Já existe um serviço com esse nome.' } : autosave.errors;

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Editar serviço"
      size="sm"
      footer={
        <>
          <AutosaveIndicator status={autosave.status} message={autosave.message} onRetry={() => void autosave.retry()} className="mr-auto" />
          <Button
            variant="dark"
            onClick={async () => {
              await autosave.flush();
              onClose();
            }}
          >
            Concluir
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void autosave.flush();
        }}
        noValidate
        autoComplete="off"
        className="flex flex-col gap-5"
      >
        <ServiceFields value={value} onChange={(p) => setValue((v) => ({ ...v, ...p }))} errors={errors} />
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
