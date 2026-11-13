'use client';

import type { AppointmentDTO, AppointmentStatus, FinanceEntryDTO } from '@orts/backend/contracts';
import { APPOINTMENT_STATUSES, datesOf, FINANCE_STATUS_LABELS, isMultiDay, PAYMENT_METHOD_LABELS } from '@orts/backend/contracts';
import { AlertTriangle, CircleAlert, Clock, MapPin, Navigation, NotebookPen, Pencil, Phone, Plus, Trash2, Wallet, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import { WhatsAppIcon } from '@/components/site/icons';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useAppointment, useChangeStatus, useDeleteAppointment, useFinanceEntries, useSaveFinanceEntry, useServices, useSettings } from '@/hooks/admin/queries';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { capitalize, formatDurationLabel, formatLongDate, formatNumericDate, formatPhone, formatShortDate, todayISO } from '@/lib/format';
import { mapsDirectionsLink, telLink, whatsappLink } from '@/lib/links';
import { buildConfirmationMessage, mapsQueryFor, placeOf } from '@/lib/messages';
import { formatBRL } from '@/lib/money';
import { useAdminUI } from './admin-ui';
import { ServiceDot, STATUS_META, StatusBadge } from './status';

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3.5 py-4">
      <span className="mt-0.5 text-steel-500 [&_svg]:size-[18px]" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">{label}</p>
        <div className="mt-1 text-[15px] leading-relaxed text-ink">{children}</div>
      </div>
    </div>
  );
}

/** Painel lateral (desktop) / inferior (celular) com detalhes e ações do atendimento. */
export function AppointmentDetails({ id, onClose, onEdit }: { id: string | null; onClose: () => void; onEdit: (a: AppointmentDTO) => void }) {
  const { data: a, isLoading, isError } = useAppointment(id);
  const settings = useSettings();
  const changeStatus = useChangeStatus();
  const remove = useDeleteAppointment();
  const confirm = useConfirm();

  async function setStatus(status: AppointmentStatus) {
    if (!a || status === a.status) return;
    try {
      await changeStatus.mutateAsync({ id: a.id, status });
      toast.success(`Status alterado para "${STATUS_META[status].label}".`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível alterar o status.');
    }
  }

  async function onDelete() {
    if (!a) return;
    const ok = await confirm({
      title: 'Excluir este atendimento?',
      description: `${a.clientName} — ${capitalize(formatLongDate(a.date))}, ${a.startTime}. Esta ação não pode ser desfeita. Para manter o histórico, prefira cancelar.`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(a.id);
      toast.success('Atendimento excluído.');
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível excluir.');
    }
  }

  const confirmation = a && settings.data ? buildConfirmationMessage(settings.data.confirmationTemplate, a, settings.data.businessName) : undefined;
  // dados que o cliente ainda não mandou (dá para completar em Editar)
  const missing = a ? [!a.clientPhone && 'telefone', !placeOf(a) && 'endereço'].filter((m): m is string => Boolean(m)) : [];

  return (
    <Dialog
      open={id !== null}
      onOpenChange={(open) => !open && onClose()}
      variant="drawer"
      title={a ? a.clientName : 'Atendimento'}
      description={a ? [a.serviceType.name, a.neighborhood].filter(Boolean).join(' · ') : undefined}
      footer={
        a && (
          <>
            <Button variant="danger-ghost" onClick={onDelete} loading={remove.isPending} className="sm:mr-auto">
              <Trash2 className="size-4" aria-hidden="true" /> Excluir
            </Button>
            <Button variant="dark" onClick={() => onEdit(a)}>
              <Pencil className="size-4" aria-hidden="true" /> Editar
            </Button>
          </>
        )
      }
    >
      {isLoading && (
        <div className="space-y-4 pt-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-12" />
          <Skeleton className="h-40" />
        </div>
      )}
      {isError && <p className="py-6 text-[15px] text-muted">Atendimento não encontrado. Ele pode ter sido excluído.</p>}
      {a && (
        <div className="flex flex-col gap-6 pt-1">
          <div className="on-dark rounded-lg bg-navy-900 p-5 text-porcelain">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13px] font-medium text-porcelain/70">
                {capitalize(formatLongDate(a.date))}
                {isMultiDay(a) && <> até {formatLongDate(a.endDate)}</>}
              </p>
              <StatusBadge status={a.status} />
            </div>
            <p className="tabular mt-2 text-[2rem] font-semibold leading-none tracking-[-0.02em]">
              {a.startTime}
              <span className="text-porcelain/45">
                {isMultiDay(a) ? ' → ' : ' – '}
                {a.endTime}
              </span>
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-porcelain/70">
              <Clock className="size-3.5" aria-hidden="true" /> {formatDurationLabel(a.durationMinutes)}
              {isMultiDay(a) && <span className="rounded-full bg-porcelain/12 px-2 py-0.5 text-[11px] font-semibold text-porcelain/85">{datesOf(a).length} dias</span>}
              {a.outsideBusinessHours && <span className="rounded-full bg-champagne-400/20 px-2 py-0.5 text-[11px] font-semibold text-champagne-300">Encaixe</span>}
            </p>
          </div>

          {(a.clientPhone || placeOf(a)) && (
            <div className={cn('grid gap-2', a.clientPhone && placeOf(a) ? 'grid-cols-3' : a.clientPhone ? 'grid-cols-2' : 'grid-cols-1')}>
              {a.clientPhone && (
                <>
                  <Button asChild variant="secondary" className="h-auto flex-col gap-1.5 py-3 text-[12px]">
                    <a href={whatsappLink(a.clientPhone, confirmation)} target="_blank" rel="noopener noreferrer">
                      <WhatsAppIcon className="size-5 text-status-completed" />
                      Confirmar
                    </a>
                  </Button>
                  <Button asChild variant="secondary" className="h-auto flex-col gap-1.5 py-3 text-[12px]">
                    <a href={telLink(a.clientPhone)}>
                      <Phone className="size-5 text-steel-600" aria-hidden="true" />
                      Ligar
                    </a>
                  </Button>
                </>
              )}
              {placeOf(a) && (
                <Button asChild variant="secondary" className="h-auto flex-col gap-1.5 py-3 text-[12px]">
                  <a href={mapsDirectionsLink(mapsQueryFor(a))} target="_blank" rel="noopener noreferrer">
                    <Navigation className="size-5 text-steel-600" aria-hidden="true" />
                    Rota
                  </a>
                </Button>
              )}
            </div>
          )}
          {missing.length > 0 && (
            <button
              type="button"
              onClick={() => onEdit(a)}
              className="flex items-center gap-3 rounded-md border border-dashed border-status-pending/50 bg-status-pending-bg/60 px-4 py-3 text-left text-[14px] leading-snug text-status-pending-fg transition-colors hover:border-status-pending"
            >
              <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                Falta {missing.join(' e ')} do cliente.
              </span>
              <span className="shrink-0 font-semibold underline underline-offset-4">Completar</span>
            </button>
          )}

          <div role="radiogroup" aria-label="Status do atendimento">
            <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">Alterar status</p>
            <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
              {APPOINTMENT_STATUSES.map((status) => {
                const meta = STATUS_META[status];
                const Icon = meta.icon;
                const active = a.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={changeStatus.isPending}
                    onClick={() => setStatus(status)}
                    className={cn(
                      'flex h-11 items-center gap-2 whitespace-nowrap rounded-md border px-2.5 text-[12.5px] font-semibold transition-colors disabled:opacity-60',
                      active ? cn(meta.pill, 'border-transparent') : 'border-line-strong bg-paper text-ink-soft hover:border-navy-700',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <PaymentSection appointment={a} />
          <div className="divide-y divide-line border-y border-line">
            <Row icon={<Phone />} label="Telefone">
              {a.clientPhone ? (
                <a href={telLink(a.clientPhone)} className="tabular font-medium underline-offset-4 hover:underline">
                  {formatPhone(a.clientPhone)}
                </a>
              ) : (
                <span className="text-muted">Não informado</span>
              )}
            </Row>
            <Row icon={<MapPin />} label="Endereço">
              {a.address ?? <span className="text-muted">Não informado</span>}
              {(a.neighborhood || a.city) && (
                <>
                  <br />
                  <span className="text-muted">{[a.neighborhood, a.city].filter(Boolean).join(' · ')}</span>
                </>
              )}
            </Row>
            <Row icon={<Wrench />} label="Serviço">
              <span className="inline-flex items-center gap-2">
                <ServiceDot color={a.serviceType.color} /> {a.serviceType.name}
              </span>
            </Row>
            {a.notes && (
              <Row icon={<NotebookPen />} label="Observações">
                <span className="whitespace-pre-line">{a.notes}</span>
              </Row>
            )}
          </div>
          <p className="text-[12px] text-subtle">
            Registrado em {new Date(a.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}
            {a.updatedAt !== a.createdAt &&
              ` · atualizado em ${new Date(a.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}`}
          </p>
        </div>
      )}
    </Dialog>
  );
}

/** Pagamento do atendimento: lançamentos de entrada ligados a ele no financeiro. */
function PaymentSection({ appointment: a }: { appointment: AppointmentDTO }) {
  const entries = useFinanceEntries({ appointmentId: a.id, pageSize: 20 });
  const services = useServices();
  const save = useSaveFinanceEntry();
  const { openEntry } = useAdminUI();
  const items = entries.data?.items ?? [];
  const price = services.data?.find((s) => s.id === a.serviceType.id)?.priceCents ?? null;
  const paidTotal = items.filter((e) => e.status === 'paid').reduce((sum, e) => sum + (e.kind === 'income' ? e.amountCents : -e.amountCents), 0);

  const register = () =>
    openEntry({
      defaults: {
        kind: 'income',
        categoryName: 'Serviços',
        description: `${a.serviceType.name} · ${a.clientName}`,
        amountCents: items.length ? null : price,
        date: todayISO(),
        status: 'paid',
        paymentMethod: 'pix',
        appointment: { id: a.id, label: `${a.clientName} · ${formatNumericDate(a.date)} ${a.startTime}` },
      },
    });

  async function settle(e: FinanceEntryDTO) {
    try {
      await save.mutateAsync({ id: e.id, input: { status: 'paid', date: todayISO() } });
      toast.success('Recebimento registrado.', { description: formatBRL(e.amountCents) });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível atualizar.');
    }
  }

  return (
    <div>
      <p className="mb-2.5 flex items-center justify-between gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">
        Pagamento
        {items.length > 0 && <span className="tabular normal-case tracking-normal text-muted">Recebido: {formatBRL(paidTotal)}</span>}
      </p>
      {entries.isLoading ? (
        <Skeleton className="h-16" />
      ) : items.length === 0 ? (
        <div className={cn('rounded-md border border-dashed border-line-strong p-4', a.status === 'completed' && 'border-solid border-status-pending/40 bg-status-pending-bg/60')}>
          <p className={cn('flex items-start gap-2 text-[14px]', a.status === 'completed' ? 'font-semibold text-status-pending-fg' : 'text-ink-soft')}>
            {a.status === 'completed' && <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
            {a.status === 'completed' ? 'Serviço concluído sem pagamento registrado.' : 'Nenhum pagamento registrado ainda.'}
          </p>
          <Button variant="dark" size="sm" className="mt-3" onClick={register}>
            <Wallet className="size-4" aria-hidden="true" /> Registrar pagamento
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line">
          {items.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
              <button type="button" onClick={() => openEntry({ entry: e })} className="min-w-0 flex-1 text-left">
                <span className="tabular block text-[15px] font-semibold text-ink">{formatBRL(e.amountCents)}</span>
                <span className={cn('block truncate text-[12px]', e.overdue ? 'font-semibold text-status-pending-fg' : 'text-muted')}>
                  {[e.overdue ? 'Vencido' : FINANCE_STATUS_LABELS[e.kind][e.status], e.paymentMethod ? PAYMENT_METHOD_LABELS[e.paymentMethod] : null, formatShortDate(e.date)].filter(Boolean).join(' · ')}
                </span>
              </button>
              {e.status === 'pending' && (
                <Button variant="secondary" size="sm" onClick={() => void settle(e)} disabled={save.isPending}>
                  Recebi
                </Button>
              )}
            </li>
          ))}
          <li>
            <button type="button" onClick={register} className="flex h-11 w-full items-center gap-2 px-3 text-[13px] font-semibold text-steel-600 hover:bg-steel-100/60">
              <Plus className="size-4" aria-hidden="true" /> Registrar outro pagamento
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
