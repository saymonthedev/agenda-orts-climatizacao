'use client';

import type { AppointmentDTO, AppointmentStatus } from '@orts/backend/contracts';
import { APPOINTMENT_STATUSES } from '@orts/backend/contracts';
import { Clock, MapPin, Navigation, NotebookPen, Pencil, Phone, Trash2, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import { WhatsAppIcon } from '@/components/site/icons';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useAppointment, useChangeStatus, useDeleteAppointment, useSettings } from '@/hooks/admin/queries';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { capitalize, formatDurationLabel, formatLongDate, formatPhone } from '@/lib/format';
import { mapsDirectionsLink, telLink, whatsappLink } from '@/lib/links';
import { buildConfirmationMessage, mapsQueryFor } from '@/lib/messages';
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

  return (
    <Dialog
      open={id !== null}
      onOpenChange={(open) => !open && onClose()}
      variant="drawer"
      title={a ? a.clientName : 'Atendimento'}
      description={a ? `${a.serviceType.name} · ${a.neighborhood}` : undefined}
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
              <p className="text-[13px] font-medium text-porcelain/70">{capitalize(formatLongDate(a.date))}</p>
              <StatusBadge status={a.status} />
            </div>
            <p className="tabular mt-2 text-[2rem] font-semibold leading-none tracking-[-0.02em]">
              {a.startTime}
              <span className="text-porcelain/45"> – {a.endTime}</span>
            </p>
            <p className="mt-2 flex items-center gap-2 text-[13px] text-porcelain/70">
              <Clock className="size-3.5" aria-hidden="true" /> {formatDurationLabel(a.durationMinutes)}
              {a.outsideBusinessHours && <span className="rounded-full bg-champagne-400/20 px-2 py-0.5 text-[11px] font-semibold text-champagne-300">Encaixe</span>}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
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
            <Button asChild variant="secondary" className="h-auto flex-col gap-1.5 py-3 text-[12px]">
              <a href={mapsDirectionsLink(mapsQueryFor(a))} target="_blank" rel="noopener noreferrer">
                <Navigation className="size-5 text-steel-600" aria-hidden="true" />
                Rota
              </a>
            </Button>
          </div>

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

          <div className="divide-y divide-line border-y border-line">
            <Row icon={<Phone />} label="Telefone">
              <a href={telLink(a.clientPhone)} className="tabular font-medium underline-offset-4 hover:underline">
                {formatPhone(a.clientPhone)}
              </a>
            </Row>
            <Row icon={<MapPin />} label="Endereço">
              {a.address}
              <br />
              <span className="text-muted">
                {a.neighborhood} · {a.city}
              </span>
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
