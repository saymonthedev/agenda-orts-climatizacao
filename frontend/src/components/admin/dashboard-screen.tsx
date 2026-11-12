'use client';

import type { AppointmentDTO, DashboardDTO } from '@orts/backend/contracts';
import { ArrowRight, CalendarCheck2, CalendarDays, CheckCheck, CircleDashed, Navigation, Plus, Play, XCircle } from 'lucide-react';
import Link from 'next/link';
import { WhatsAppIcon } from '@/components/site/icons';
import { Button, buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';
import { useChangeStatus, useDashboard, useMe, useSettings } from '@/hooks/admin/queries';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { capitalize, formatLongDate, formatWeekdayShort, minutesOf, nowMinutes, todayISO } from '@/lib/format';
import { mapsDirectionsLink, whatsappLink } from '@/lib/links';
import { buildConfirmationMessage, mapsQueryFor } from '@/lib/messages';
import { useAdminUI } from './admin-ui';
import { PageHeader } from './shell';
import { SERVICE_COLOR, ServiceDot, StatusBadge } from './status';

function greeting() {
  const h = Math.floor(nowMinutes() / 60);
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function relativeStart(a: AppointmentDTO): string {
  const today = todayISO();
  if (a.date !== today) {
    const diffDays = Math.round((Date.parse(a.date) - Date.parse(today)) / 86_400_000);
    return diffDays === 1 ? 'amanhã' : `em ${diffDays} dias`;
  }
  const diff = minutesOf(a.startTime) - nowMinutes();
  if (diff <= 0) return minutesOf(a.endTime) > nowMinutes() ? 'agora' : 'hoje';
  if (diff < 60) return `em ${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `em ${h}h${m ? String(m).padStart(2, '0') : ''}`;
}

export function DashboardScreen() {
  const me = useMe();
  const { data, isLoading } = useDashboard();
  const { openCreate } = useAdminUI();
  const firstName = me.data?.name.split(' ')[0] ?? '';

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle={capitalize(formatLongDate(todayISO()))}
        actions={
          <>
            <Link href="/admin/agenda" className={buttonClasses('secondary', 'md')}>
              <CalendarDays className="size-4" aria-hidden="true" /> Abrir agenda
            </Link>
            <Button variant="dark" onClick={() => openCreate()} className="hidden lg:inline-flex">
              <Plus className="size-4" aria-hidden="true" /> Novo agendamento
            </Button>
          </>
        }
      />
      <div className="flex flex-col gap-6 px-4 sm:px-6 lg:px-10">
        {isLoading || !data ? <DashboardSkeleton /> : <DashboardContent data={data} />}
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando o painel">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function StatTile({ label, value, context, icon }: { label: string; value: number; context: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-paper p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
        <span className="text-steel-500 [&_svg]:size-4" aria-hidden="true">
          {icon}
        </span>
        {label}
      </p>
      <div>
        <p className="tabular text-[2.1rem] font-semibold leading-none tracking-[-0.02em] text-ink">{value}</p>
        <p className="mt-1.5 text-[12px] leading-snug text-subtle">{context}</p>
      </div>
    </div>
  );
}

function DashboardContent({ data }: { data: DashboardDTO }) {
  const today = data.today;
  return (
    <>
      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Atendimentos hoje"
          value={today.total}
          icon={<CalendarCheck2 />}
          context={`${today.byStatus.confirmed} confirmados · ${today.byStatus.completed} concluídos`}
        />
        <StatTile label="Aguardando confirmação" value={data.pendingConfirmation.total} icon={<CircleDashed />} context="Pendentes a partir de agora" />
        <StatTile label="Concluídos na semana" value={data.week.completed} icon={<CheckCheck />} context={`de ${data.week.total} agendados na semana`} />
        <StatTile label="Cancelados no mês" value={data.month.cancelled} icon={<XCircle />} context={capitalize(data.month.label)} />
      </section>

      <NextAppointment appointment={data.next} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <TodayList items={today.appointments} />
        <div className="flex flex-col gap-6">
          <PendingList items={data.pendingConfirmation.items} total={data.pendingConfirmation.total} />
          <WeekChart week={data.week} />
        </div>
      </div>
    </>
  );
}

function NextAppointment({ appointment: a }: { appointment: AppointmentDTO | null }) {
  const { openDetails, openCreate } = useAdminUI();
  const settings = useSettings();
  const changeStatus = useChangeStatus();

  if (!a) {
    return (
      <section className="on-dark flex flex-col items-start justify-between gap-4 rounded-xl bg-navy-900 p-6 text-porcelain sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow text-[11px] text-champagne-400">Próximo atendimento</p>
          <p className="mt-2 text-xl font-semibold">Nenhum atendimento agendado pela frente.</p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="size-4" aria-hidden="true" /> Agendar
        </Button>
      </section>
    );
  }

  const message = settings.data ? buildConfirmationMessage(settings.data.confirmationTemplate, a, settings.data.businessName) : undefined;
  const nextStatus = a.status === 'in_progress' ? 'completed' : 'in_progress';

  async function advance() {
    try {
      await changeStatus.mutateAsync({ id: a!.id, status: nextStatus });
      toast.success(nextStatus === 'completed' ? 'Atendimento concluído.' : 'Atendimento iniciado.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível atualizar.');
    }
  }

  return (
    <section aria-label="Próximo atendimento" className="on-dark relative isolate overflow-hidden rounded-xl bg-navy-900 text-porcelain">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(60%_90%_at_100%_0%,rgb(214_197_160/0.18),transparent_70%)]" />
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-7">
        <button type="button" onClick={() => openDetails(a.id)} className="group min-w-0 text-left">
          <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-champagne-400">
            Próximo atendimento <span className="font-semibold normal-case tracking-normal text-porcelain/60">· {relativeStart(a)}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="tabular text-[2.4rem] font-semibold leading-none tracking-[-0.02em]">{a.startTime}</p>
            <p className="text-[15px] text-porcelain/60">
              {a.date === todayISO() ? 'hoje' : capitalize(formatLongDate(a.date))} · até {a.endTime}
            </p>
          </div>
          <p className="mt-3 truncate text-xl font-semibold group-hover:underline group-hover:decoration-champagne-400 group-hover:underline-offset-4">
            {a.clientName}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[14px] text-porcelain/70">
            <ServiceDot color={a.serviceType.color} className="ring-1 ring-white/30" /> {a.serviceType.name}
            <span aria-hidden="true">·</span> {a.address}, {a.neighborhood}
          </p>
        </button>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline-light" size="md">
            <a href={whatsappLink(a.clientPhone, message)} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="size-4" /> WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline-light" size="md">
            <a href={mapsDirectionsLink(mapsQueryFor(a))} target="_blank" rel="noopener noreferrer">
              <Navigation className="size-4" aria-hidden="true" /> Rota
            </a>
          </Button>
          <Button variant="primary" size="md" onClick={advance} loading={changeStatus.isPending}>
            {nextStatus === 'completed' ? <CheckCheck className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            {nextStatus === 'completed' ? 'Concluir' : 'Iniciar'}
          </Button>
        </div>
      </div>
    </section>
  );
}

function SectionCard({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-line bg-paper', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function AppointmentRow({ a, onOpen, trailing }: { a: AppointmentDTO; onOpen: () => void; trailing?: React.ReactNode }) {
  const now = nowMinutes();
  const current = a.date === todayISO() && minutesOf(a.startTime) <= now && minutesOf(a.endTime) > now && a.status !== 'cancelled';
  return (
    <li className={cn('flex items-center gap-3 px-4 sm:px-5', current && 'bg-steel-100/60')}>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left">
        <span className="tabular w-12 shrink-0 text-[15px] font-semibold text-ink">{a.startTime}</span>
        <span className={cn('h-9 w-[3px] shrink-0 rounded-full', SERVICE_COLOR[a.serviceType.color])} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-[15px] font-semibold text-ink', a.status === 'cancelled' && 'text-subtle line-through')}>{a.clientName}</span>
          <span className="block truncate text-[13px] text-muted">
            {a.serviceType.name} · {a.neighborhood}
          </span>
        </span>
      </button>
      {trailing ?? <StatusBadge status={a.status} size="sm" className="hidden min-[400px]:inline-flex" />}
    </li>
  );
}

function TodayList({ items }: { items: AppointmentDTO[] }) {
  const { openDetails, openCreate } = useAdminUI();
  return (
    <SectionCard
      title="Agenda de hoje"
      action={
        <Link href="/admin/agenda?view=day" className="inline-flex items-center gap-1 text-[13px] font-semibold text-steel-600 hover:text-ink">
          Linha do tempo <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      }
    >
      {items.length ? (
        <ul className="divide-y divide-line">
          {items.map((a) => (
            <AppointmentRow key={a.id} a={a} onOpen={() => openDetails(a.id)} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<CalendarDays />}
          title="Nenhum atendimento hoje"
          description="Os atendimentos do dia aparecem aqui, em ordem de horário."
          action={
            <Button variant="secondary" onClick={() => openCreate({ date: todayISO() })}>
              <Plus className="size-4" aria-hidden="true" /> Agendar para hoje
            </Button>
          }
        />
      )}
    </SectionCard>
  );
}

function PendingList({ items, total }: { items: AppointmentDTO[]; total: number }) {
  const { openDetails } = useAdminUI();
  const changeStatus = useChangeStatus();
  const settings = useSettings();

  async function confirmAppointment(a: AppointmentDTO) {
    try {
      await changeStatus.mutateAsync({ id: a.id, status: 'confirmed' });
      toast.success('Atendimento confirmado.', { description: `${a.clientName} · ${a.startTime}` });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível confirmar.');
    }
  }

  return (
    <SectionCard
      title={`Aguardando confirmação${total ? ` (${total})` : ''}`}
      action={
        total > items.length ? (
          <Link href="/admin/atendimentos?status=pending" className="inline-flex items-center gap-1 text-[13px] font-semibold text-steel-600 hover:text-ink">
            Ver todos <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : undefined
      }
    >
      {items.length ? (
        <ul className="divide-y divide-line">
          {items.map((a) => (
            <AppointmentRow
              key={a.id}
              a={a}
              onOpen={() => openDetails(a.id)}
              trailing={
                <div className="flex shrink-0 items-center gap-1">
                  <Tooltip content="Enviar confirmação pelo WhatsApp">
                    <a
                      href={whatsappLink(a.clientPhone, settings.data ? buildConfirmationMessage(settings.data.confirmationTemplate, a, settings.data.businessName) : undefined)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex size-10 items-center justify-center rounded-md text-status-completed hover:bg-status-completed-bg"
                      aria-label={`Enviar confirmação para ${a.clientName} pelo WhatsApp`}
                    >
                      <WhatsAppIcon className="size-5" />
                    </a>
                  </Tooltip>
                  <Button size="sm" variant="secondary" onClick={() => confirmAppointment(a)} disabled={changeStatus.isPending}>
                    Confirmar
                  </Button>
                </div>
              }
            />
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-[14px] text-muted">Tudo confirmado por aqui.</p>
      )}
    </SectionCard>
  );
}

/** Barras empilhadas por dia: concluídos (aço escuro) + demais agendados (aço claro). Paleta validada (ordinal). */
function WeekChart({ week }: { week: DashboardDTO['week'] }) {
  const max = Math.max(4, ...week.days.map((d) => d.total));
  const today = todayISO();
  const ticks = [max, Math.round(max / 2), 0];
  return (
    <SectionCard
      title="Esta semana"
      action={
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-[#2e4d5d]" /> Concluídos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-[#7c9dac]" /> Agendados
          </span>
        </div>
      }
    >
      <div className="px-4 pb-4 pt-5 sm:px-5">
        <div className="relative flex h-40 gap-2 pl-7" aria-hidden="true">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(t / max) * 100}%`, transform: 'translateY(50%)' }}>
              <span className="tabular w-5 text-right text-[11px] text-subtle">{t}</span>
              <span className="h-px flex-1 bg-line" />
            </div>
          ))}
          {week.days.map((d) => {
            const done = d.completed;
            const rest = Math.max(0, d.total - d.completed);
            return (
              <Tooltip key={d.date} content={`${capitalize(formatLongDate(d.date))}: ${d.total} agendado${d.total === 1 ? '' : 's'}, ${d.completed} concluído${d.completed === 1 ? '' : 's'}`}>
                <Link href={`/admin/agenda?view=day&date=${d.date}`} tabIndex={-1} className="relative z-10 flex flex-1 flex-col justify-end rounded-sm hover:bg-ink/[0.03]">
                  {rest > 0 && <span className="block rounded-t-[4px] bg-[#7c9dac]" style={{ height: `${(rest / max) * 100}%` }} />}
                  {rest > 0 && done > 0 && <span className="block h-[2px] bg-paper" />}
                  {done > 0 && <span className={cn('block bg-[#2e4d5d]', rest === 0 && 'rounded-t-[4px]')} style={{ height: `${(done / max) * 100}%` }} />}
                </Link>
              </Tooltip>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2 pl-7">
          {week.days.map((d) => (
            <span key={d.date} className={cn('flex-1 text-center text-[11px] capitalize', d.date === today ? 'font-bold text-ink' : 'text-subtle')}>
              {formatWeekdayShort(d.date)}
              <span className="tabular block">{Number(d.date.slice(8))}</span>
            </span>
          ))}
        </div>
        <div className="sr-only">
        <table>
          <caption>Atendimentos por dia nesta semana</caption>
          <thead>
            <tr>
              <th scope="col">Dia</th>
              <th scope="col">Agendados</th>
              <th scope="col">Concluídos</th>
              <th scope="col">Cancelados</th>
            </tr>
          </thead>
          <tbody>
            {week.days.map((d) => (
              <tr key={d.date}>
                <th scope="row">{capitalize(formatLongDate(d.date))}</th>
                <td>{d.total}</td>
                <td>{d.completed}</td>
                <td>{d.cancelled}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </SectionCard>
  );
}
