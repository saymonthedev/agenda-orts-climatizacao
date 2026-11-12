'use client';

import type { FinanceCategoryDTO, FinanceEntryDTO, FinanceKind, FinanceStatus, PaymentMethod } from '@orts/backend/contracts';
import { financeEntryInputSchema, FINANCE_STATUS_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@orts/backend/contracts';
import { CalendarDays, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { AutosaveIndicator } from '@/components/ui/autosave-indicator';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog } from '@/components/ui/dialog';
import { TextArea, TextField } from '@/components/ui/field';
import { MoneyField } from '@/components/ui/money-field';
import { Segmented } from '@/components/ui/segmented';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { useDeleteFinanceEntry, useFinanceCategories, useSaveFinanceEntry } from '@/hooks/admin/queries';
import { useAutosave } from '@/hooks/use-autosave';
import { ApiError } from '@/lib/api';
import { formatNumericDate, todayISO } from '@/lib/format';
import { formatBRL } from '@/lib/money';

/** Valores iniciais para um lançamento novo (ex.: pagamento de um atendimento). */
export type EntryDefaults = {
  kind?: FinanceKind;
  description?: string;
  amountCents?: number | null;
  categoryName?: string;
  date?: string;
  status?: FinanceStatus;
  paymentMethod?: PaymentMethod | null;
  appointment?: { id: string; label: string };
};

type Fields = {
  kind: FinanceKind;
  description: string;
  amountCents: number | null;
  categoryId: string;
  date: string;
  status: FinanceStatus;
  paymentMethod: PaymentMethod | '';
  notes: string;
};

const METHOD_OPTIONS = [{ value: '', label: 'Não informar' }, ...PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))] as {
  value: PaymentMethod | '';
  label: string;
}[];

const toPayload = (f: Fields, appointmentId: string | null) => ({
  kind: f.kind,
  description: f.description,
  amountCents: f.amountCents ?? 0,
  categoryId: f.categoryId,
  date: f.date,
  status: f.status,
  paymentMethod: f.paymentMethod || null,
  appointmentId,
  notes: f.notes.trim() || null,
});

function validateEntry(payload: ReturnType<typeof toPayload>): Record<string, string> {
  const parsed = financeEntryInputSchema.safeParse(payload);
  if (parsed.success) return {};
  const found: Record<string, string> = {};
  for (const issue of parsed.error.issues) found[String(issue.path[0] ?? '_')] ??= issue.message;
  return found;
}

function categoriesOf(all: FinanceCategoryDTO[] | undefined, kind: FinanceKind, keepId?: string) {
  return (all ?? []).filter((c) => c.kind === kind && (!c.archived || c.id === keepId));
}

function EntryFields({
  value,
  onChange,
  errors,
  categories,
  keepCategoryId,
  appointmentLabel,
}: {
  value: Fields;
  onChange: (p: Partial<Fields>) => void;
  errors: Record<string, string>;
  categories: FinanceCategoryDTO[] | undefined;
  keepCategoryId?: string;
  appointmentLabel?: string | null;
}) {
  const options = categoriesOf(categories, value.kind, keepCategoryId).map((c) => ({ value: c.id, label: c.archived ? `${c.name} (arquivada)` : c.name }));
  const statusLabels = FINANCE_STATUS_LABELS[value.kind];
  const isIncome = value.kind === 'income';

  function setKind(kind: FinanceKind) {
    if (kind === value.kind) return;
    const first = categoriesOf(categories, kind)[0];
    onChange({ kind, categoryId: first?.id ?? '' });
  }

  return (
    <>
      <Segmented
        label="Tipo"
        value={value.kind}
        onChange={setKind}
        options={[
          { value: 'income', label: 'Entrada' },
          { value: 'expense', label: 'Saída' },
        ]}
        fullWidth
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField label="Valor" value={value.amountCents} onChange={(amountCents) => onChange({ amountCents })} error={errors.amountCents} />
        <Select label="Categoria" value={value.categoryId} onChange={(categoryId) => onChange({ categoryId })} options={options} placeholder="Escolha a categoria" error={errors.categoryId} />
      </div>
      <TextField
        label="Descrição"
        value={value.description}
        onChange={(e) => onChange({ description: e.target.value })}
        error={errors.description}
        maxLength={120}
        placeholder={isIncome ? 'Ex.: Instalação · Maria Krause' : 'Ex.: Tubo de cobre e isolamento'}
      />
      <Segmented
        label="Situação"
        value={value.status}
        onChange={(status) => onChange({ status })}
        options={[
          { value: 'paid', label: statusLabels.paid },
          { value: 'pending', label: statusLabels.pending },
        ]}
        fullWidth
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <DatePicker
          label={value.status === 'pending' ? 'Vencimento' : isIncome ? 'Data do recebimento' : 'Data do pagamento'}
          value={value.date}
          onChange={(date) => onChange({ date })}
          error={errors.date}
        />
        <Select label="Forma de pagamento" value={value.paymentMethod} onChange={(paymentMethod) => onChange({ paymentMethod })} options={METHOD_OPTIONS} optional />
      </div>
      {appointmentLabel && (
        <p className="flex items-center gap-2 rounded-md bg-steel-100 px-3 py-2.5 text-[13px] text-ink-soft">
          <CalendarDays className="size-4 shrink-0 text-steel-600" aria-hidden="true" />
          <span className="min-w-0">
            Atendimento: <span className="font-semibold text-ink">{appointmentLabel}</span>
          </span>
        </p>
      )}
      <TextArea label="Observações" optional rows={2} value={value.notes} onChange={(e) => onChange({ notes: e.target.value })} error={errors.notes} maxLength={500} />
    </>
  );
}

export function FinanceEntryDialog({
  open,
  onOpenChange,
  entry,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: FinanceEntryDTO;
  defaults?: EntryDefaults;
}) {
  if (!open) return null;
  return entry ? <EditEntryDialog entry={entry} onClose={() => onOpenChange(false)} /> : <NewEntryDialog defaults={defaults} onClose={() => onOpenChange(false)} />;
}

/** Lançamento novo: só existe depois de "Adicionar". */
function NewEntryDialog({ defaults, onClose }: { defaults?: EntryDefaults; onClose: () => void }) {
  const categories = useFinanceCategories();
  const save = useSaveFinanceEntry();
  const kind = defaults?.kind ?? 'income';
  const initialCategory = useMemo(() => {
    const list = categoriesOf(categories.data, kind);
    return (defaults?.categoryName ? list.find((c) => c.name === defaults.categoryName) : undefined)?.id ?? list[0]?.id ?? '';
  }, [categories.data, kind, defaults?.categoryName]);
  const [value, setValue] = useState<Fields>({
    kind,
    description: defaults?.description ?? '',
    amountCents: defaults?.amountCents ?? null,
    categoryId: '',
    date: defaults?.date ?? todayISO(),
    status: defaults?.status ?? 'paid',
    paymentMethod: defaults?.paymentMethod ?? (kind === 'income' ? 'pix' : ''),
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fields = value.categoryId ? value : { ...value, categoryId: initialCategory };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = toPayload(fields, defaults?.appointment?.id ?? null);
    const found = validateEntry(payload);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      const saved = await save.mutateAsync({ input: payload });
      toast.success(saved.kind === 'income' ? 'Entrada registrada.' : 'Saída registrada.', { description: `${saved.description} · ${formatBRL(saved.amountCents)}` });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        if (!Object.keys(err.fields).length) toast.error(err.message);
      }
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={defaults?.appointment ? 'Registrar pagamento' : 'Novo lançamento'}
      description={defaults?.appointment ? 'O valor entra no financeiro ligado a este atendimento.' : 'Registre uma entrada ou uma saída de dinheiro.'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="finance-entry-form" variant="dark" loading={save.isPending}>
            Adicionar
          </Button>
        </>
      }
    >
      <form id="finance-entry-form" onSubmit={submit} noValidate autoComplete="off" className="flex flex-col gap-5">
        <EntryFields
          value={fields}
          onChange={(p) => setValue((v) => ({ ...v, categoryId: v.categoryId || initialCategory, ...p }))}
          errors={errors}
          categories={categories.data}
          appointmentLabel={defaults?.appointment?.label}
        />
      </form>
    </Dialog>
  );
}

/** Lançamento existente: cada alteração válida é salva sozinha. */
function EditEntryDialog({ entry, onClose }: { entry: FinanceEntryDTO; onClose: () => void }) {
  const categories = useFinanceCategories();
  const save = useSaveFinanceEntry();
  const remove = useDeleteFinanceEntry();
  const confirm = useConfirm();
  const [initial] = useState<Fields>(() => ({
    kind: entry.kind,
    description: entry.description,
    amountCents: entry.amountCents,
    categoryId: entry.category.id,
    date: entry.date,
    status: entry.status,
    paymentMethod: entry.paymentMethod ?? '',
    notes: entry.notes ?? '',
  }));
  const [value, setValue] = useState<Fields>(initial);
  const appointmentId = entry.appointment?.id ?? null;
  const autosave = useAutosave<Fields>({
    value,
    initial,
    validate: (v) => validateEntry(toPayload(v, appointmentId)),
    save: (v) => save.mutateAsync({ id: entry.id, input: toPayload(v, appointmentId) }),
  });
  const appointmentLabel = entry.appointment ? `${entry.appointment.clientName} · ${formatNumericDate(entry.appointment.date)} ${entry.appointment.startTime}` : null;

  async function onDelete() {
    const ok = await confirm({
      title: 'Excluir este lançamento?',
      description: `${entry.description} · ${formatBRL(entry.amountCents)}. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(entry.id);
      toast.success('Lançamento excluído.');
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível excluir.');
    }
  }

  async function close() {
    const outcome = await autosave.flush();
    if (outcome === 'invalid' || outcome === 'error') {
      const ok = await confirm({
        title: 'Fechar sem salvar a última alteração?',
        description: 'Há um campo que precisa ser corrigido. O restante do lançamento já está salvo.',
        confirmLabel: 'Fechar sem salvar',
        cancelLabel: 'Continuar editando',
        tone: 'danger',
      });
      if (!ok) return;
    }
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && void close()}
      title="Editar lançamento"
      description="As alterações são salvas automaticamente."
      size="md"
      footer={
        <>
          <div className="flex items-center justify-between gap-3 sm:mr-auto sm:justify-start">
            <Button variant="danger-ghost" size="sm" onClick={() => void onDelete()}>
              <Trash2 className="size-4" aria-hidden="true" /> Excluir lançamento
            </Button>
            <AutosaveIndicator status={autosave.status} message={autosave.message} onRetry={() => void autosave.retry()} />
          </div>
          <Button variant="dark" onClick={() => void close()}>
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
        <EntryFields
          value={value}
          onChange={(p) => setValue((v) => ({ ...v, ...p }))}
          errors={autosave.errors}
          categories={categories.data}
          keepCategoryId={entry.category.id}
          appointmentLabel={appointmentLabel}
        />
      </form>
    </Dialog>
  );
}
