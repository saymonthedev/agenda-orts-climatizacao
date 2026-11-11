'use client';

import type { AppointmentDTO, AppointmentStatus, SettingsDTO } from '@orts/backend/contracts';
import { APPOINTMENT_STATUSES } from '@orts/backend/contracts';
import { CalendarDays, Check, ChevronLeft, ChevronRight, ListFilter, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Popover } from 'radix-ui';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { useAppointmentsRange, useSettings } from '@/hooks/admin/queries';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/cn';
import {
  addDays,
  addMonths,
  capitalize,
  daysInMonth,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  formatWeekdayShort,
  minutesOf,
  nowMinutes,
  startOfMonth,
  startOfWeek,
  timeOf,
  todayISO,
  weekdayOf,
} from '@/lib/format';
import { useAdminUI } from './admin-ui';
import { AppointmentCard } from './appointment-card';
import { PageHeader } from './shell';
import { SERVICE_BORDER, STATUS_META } from './status';

type View = 'day' | 'week' | 'month';
const VIEWS: { value: View; label: string }[] = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
];

function rangeFor(view: View, date: string): { from: string; to: string; days: string[] } {
  if (view === 'day') return { from: date, to: date, days: [date] };
  if (view === 'week') {
    const from = startOfWeek(date);
    const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
    return { from, to: days[6]!, days };
  }
  const first = startOfMonth(date);
  const from = startOfWeek(first);
  const total = Math.ceil((((weekdayOf(first) + 6) % 7) + daysInMonth(first)) / 7) * 7;
  const days = Array.from({ length: total }, (_, i) => addDays(from, i));
  return { from, to: days[days.length - 1]!, days };
}

function titleFor(view: View, date: string, days: string[]): string {
  if (view === 'day') return capitalize(formatLongDate(date));
  if (view === 'month') return capitalize(formatMonthYear(date));
  const first = days[0]!;
  const last = days[6]!;
  return `${formatShortDate(first)} – ${formatShortDate(last)} de ${last.slice(0, 4)}`;
}

export function AgendaScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const desktop = useMediaQuery('(min-width: 768px)', true);
  const today = todayISO();

  const view = (VIEWS.some((v) => v.value === params.get('view')) ? params.get('view') : desktop ? 'week' : 'day') as View;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '') ? params.get('date')! : today;
  const [hidden, setHidden] = useState<AppointmentStatus[]>([]);
  const { openCreate, openDetails } = useAdminUI();

  const { from, to, days } = rangeFor(view, date);
  const settings = useSettings();
  const query = useAppointmentsRange(from, to);
  const items = useMemo(() => (query.data ?? []).filter((a) => !hidden.includes(a.status)), [query.data, hidden]);

  const navigate = (next: { view?: View; date?: string }) => {
    const sp = new URLSearchParams(params.toString());
    sp.set('view', next.view ?? view);
    sp.set('date', next.date ?? date);
    router.replace(`/admin/agenda?${sp.toString()}`, { scroll: false });
  };

  const step = (dir: 1 | -1) => {
    if (view === 'day') navigate({ date: addDays(date, dir) });
    else if (view === 'week') navigate({ date: addDays(date, dir * 7) });
    else navigate({ date: addMonths(date, dir) });
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of query.data ?? []) if (a.status !== 'cancelled') map[a.date] = (map[a.date] ?? 0) + 1;
    return map;
  }, [query.data]);

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle={titleFor(view, date, days)}
        actions={
          <Button variant="dark" onClick={() => openCreate({ date: view === 'day' ? date : undefined })} className="hidden lg:inline-flex">
            <Plus className="size-4" aria-hidden="true" /> Novo agendamento
          </Button>
        }
      />

      <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-30 border-y border-line bg-porcelain/95 px-4 py-3 backdrop-blur-md sm:px-6 lg:top-0 lg:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="icon-sm" onClick={() => step(-1)} aria-label="Período anterior">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate({ date: today })} disabled={date === today}>
              Hoje
            </Button>
            <Button variant="secondary" size="icon-sm" onClick={() => step(1)} aria-label="Próximo período">
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <JumpToDate date={date} counts={counts} onPick={(d) => navigate({ date: d })} />
          <div className="ml-auto flex items-center gap-2 max-[520px]:w-full">
            <Segmented
              label="Visualização"
              hideLabel
              size="sm"
              value={view}
              onChange={(v) => navigate({ view: v })}
              options={VIEWS}
              className="max-[520px]:flex-1"
              fullWidth
            />
            <StatusFilter hidden={hidden} onChange={setHidden} />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 sm:px-6 lg:px-10">
        {query.isError ? (
          <EmptyState title="Não foi possível carregar a agenda" description="Verifique a conexão e tente novamente." action={<Button variant="secondary" onClick={() => query.refetch()}>Tentar novamente</Button>} />
        ) : view === 'month' ? (
          <MonthView date={date} days={days} items={items} desktop={desktop} onPickDay={(d) => (desktop ? navigate({ view: 'day', date: d }) : navigate({ date: d }))} onOpen={openDetails} />
        ) : view === 'week' && !desktop ? (
          <WeekList days={days} date={date} items={items} counts={counts} onPick={(d) => navigate({ date: d })} onOpen={openDetails} onCreate={(d) => openCreate({ date: d })} />
        ) : (
          <TimeGrid
            days={days}
            items={items}
            settings={settings.data}
            loading={query.isLoading}
            onOpen={openDetails}
            onCreate={(d, t) => openCreate({ date: d, startTime: t })}
            onPickDay={(d) => navigate({ view: 'day', date: d })}
          />
        )}
      </div>
    </>
  );
}

function JumpToDate({ date, counts, onPick }: { date: string; counts: Record<string, number>; onPick: (d: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-paper px-3 text-[13px] font-semibold text-ink hover:border-ink-soft">
        <CalendarDays className="size-4 text-steel-500" aria-hidden="true" />
        Ir para data
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12} className="z-[80] w-[316px] max-w-[calc(100vw-24px)] rounded-xl border border-line bg-paper p-3 shadow-pop data-[state=open]:animate-pop-in">
          <Calendar
            value={date}
            markers={counts}
            autoFocus
            onChange={(d) => {
              onPick(d);
              setOpen(false);
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function StatusFilter({ hidden, onChange }: { hidden: AppointmentStatus[]; onChange: (h: AppointmentStatus[]) => void }) {
  const active = APPOINTMENT_STATUSES.length - hidden.length;
  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold',
          hidden.length ? 'border-navy-900 bg-navy-900 text-porcelain' : 'border-line-strong bg-paper text-ink hover:border-ink-soft',
        )}
        aria-label={`Filtrar por status (${active} de ${APPOINTMENT_STATUSES.length} visíveis)`}
      >
        <ListFilter className="size-4" aria-hidden="true" />
        <span className="max-sm:sr-only">Status</span>
        {hidden.length > 0 && <span className="tabular">{active}</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} collisionPadding={12} className="z-[80] w-64 rounded-xl border border-line bg-paper p-2 shadow-pop data-[state=open]:animate-pop-in">
          <p className="px-2 pb-2 pt-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">Mostrar status</p>
          <ul>
            {APPOINTMENT_STATUSES.map((s) => {
              const checked = !hidden.includes(s);
              const meta = STATUS_META[s];
              return (
                <li key={s}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => onChange(checked ? [...hidden, s] : hidden.filter((h) => h !== s))}
                    className="flex h-11 w-full items-center gap-3 rounded-md px-2 text-[14px] text-ink hover:bg-champagne-100"
                  >
                    <span className={cn('inline-flex size-5 items-center justify-center rounded border', checked ? 'border-navy-900 bg-navy-900 text-porcelain' : 'border-line-strong')}>
                      {checked && <Check className="size-3.5" aria-hidden="true" />}
                    </span>
                    <span className={cn('size-2.5 rounded-full', meta.dot)} aria-hidden="true" />
                    {meta.label}
                  </button>
                </li>
              );
            })}
          </ul>
          {hidden.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="mt-1 h-10 w-full rounded-md text-[13px] font-semibold text-steel-600 hover:bg-ink/[0.04]">
              Mostrar todos
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ---------------------------------------------------------------------------
// Linha do tempo (dia e semana)
// ---------------------------------------------------------------------------

const HOUR_PX = 64;

type Laid = { a: AppointmentDTO; lane: number; lanes: number };

/** Distribui atendimentos sobrepostos (ex.: cancelado + ativo) em colunas. */
function layoutDay(items: AppointmentDTO[]): Laid[] {
  const sorted = [...items].sort((x, y) => minutesOf(x.startTime) - minutesOf(y.startTime));
  const result: Laid[] = [];
  let cluster: Laid[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    cluster.forEach((c) => (c.lanes = lanes));
    result.push(...cluster);
    cluster = [];
  };
  for (const a of sorted) {
    const s = minutesOf(a.startTime);
    const e = minutesOf(a.endTime) || 24 * 60;
    if (s >= clusterEnd && cluster.length) flush();
    const used = new Set(cluster.filter((c) => (minutesOf(c.a.endTime) || 1440) > s).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    cluster.push({ a, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, e);
  }
  if (cluster.length) flush();
  return result;
}

function TimeGrid({
  days,
  items,
  settings,
  loading,
  onOpen,
  onCreate,
  onPickDay,
}: {
  days: string[];
  items: AppointmentDTO[];
  settings?: SettingsDTO;
  loading: boolean;
  onOpen: (id: string) => void;
  onCreate: (date: string, time: string) => void;
  onPickDay: (date: string) => void;
}) {
  const today = todayISO();
  const [now, setNow] = useState(() => nowMinutes());
  useEffect(() => {
    const t = window.setInterval(() => setNow(nowMinutes()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const hoursFor = (d: string) => settings?.weeklyHours.find((h) => h.weekday === weekdayOf(d));
  const enabled = days.map(hoursFor).filter((h) => h?.enabled);
  const startMin = Math.min(...enabled.map((h) => minutesOf(h!.start)), ...items.map((a) => minutesOf(a.startTime)), 8 * 60);
  const endMin = Math.max(...enabled.map((h) => minutesOf(h!.end)), ...items.map((a) => minutesOf(a.endTime) || 1440), 18 * 60);
  const gridStart = Math.max(0, Math.floor(startMin / 60) * 60 - 60);
  const gridEnd = Math.min(24 * 60, Math.ceil(endMin / 60) * 60 + 60);
  const ppm = HOUR_PX / 60;
  const height = (gridEnd - gridStart) * ppm;
  const hours = Array.from({ length: (gridEnd - gridStart) / 60 }, (_, i) => gridStart + i * 60);
  const multi = days.length > 1;
  const slot = settings?.slotIntervalMinutes ?? 30;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-paper">
      {multi && (
        <div className="grid border-b border-line" style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))` }}>
          <span />
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onPickDay(d)}
              className={cn('flex flex-col items-center gap-0.5 border-l border-line py-2.5 text-center hover:bg-champagne-100/60', d === today && 'bg-champagne-100')}
              aria-label={`Ver ${formatLongDate(d)}`}
            >
              <span className={cn('text-[11px] font-semibold uppercase tracking-wide', d === today ? 'text-champagne-700' : 'text-subtle')}>{formatWeekdayShort(d)}</span>
              <span className={cn('tabular text-[17px] font-semibold', d === today ? 'text-ink' : 'text-ink-soft')}>{Number(d.slice(8))}</span>
            </button>
          ))}
        </div>
      )}
      <div className="scrollbar-thin max-h-[calc(100dvh-260px)] min-h-[420px] overflow-y-auto" aria-busy={loading}>
        <div className="relative grid" style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))`, height }}>
          <div className="relative" aria-hidden="true">
            {hours.map((h) => (
              <span key={h} className="tabular absolute right-2 -translate-y-1/2 text-[11px] text-subtle" style={{ top: (h - gridStart) * ppm }}>
                {h === gridStart ? '' : timeOf(h)}
              </span>
            ))}
          </div>
          {days.map((d) => {
            const dh = hoursFor(d);
            const open = dh?.enabled ? [minutesOf(dh.start), minutesOf(dh.end)] : null;
            const dayItems = layoutDay(items.filter((a) => a.date === d));
            return (
              <div
                key={d}
                className="relative border-l border-line"
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const minute = gridStart + (e.clientY - rect.top) / ppm;
                  const rounded = Math.floor(minute / slot) * slot;
                  onCreate(d, timeOf(Math.max(0, Math.min(23 * 60 + 59, rounded))));
                }}
              >
                {/* fora do expediente */}
                {open ? (
                  <>
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 bg-ink/[0.035]" style={{ height: Math.max(0, open[0]! - gridStart) * ppm }} />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/[0.035]" style={{ height: Math.max(0, gridEnd - open[1]!) * ppm }} />
                  </>
                ) : (
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex justify-center bg-ink/[0.035] pt-4 text-[12px] font-semibold text-subtle">
                    {multi ? '' : 'Sem expediente'}
                  </div>
                )}
                {open &&
                  settings?.breaks.map((b) => {
                    // a pausa só aparece dentro do expediente do dia
                    const s0 = Math.max(minutesOf(b.start), open[0]!);
                    const e0 = Math.min(minutesOf(b.end), open[1]!);
                    if (e0 <= s0) return null;
                    return (
                      <div
                        key={b.start}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 flex items-start justify-center overflow-hidden bg-[repeating-linear-gradient(135deg,rgb(15_24_40/0.05)_0_6px,transparent_6px_12px)] pt-1 text-[11px] font-semibold text-subtle"
                        style={{ top: (s0 - gridStart) * ppm, height: (e0 - s0) * ppm }}
                      >
                        {multi ? '' : b.label}
                      </div>
                    );
                  })}
                {hours.map((h) => (
                  <div key={h} aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-line" style={{ top: (h - gridStart) * ppm }} />
                ))}
                {d === today && now >= gridStart && now <= gridEnd && (
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: (now - gridStart) * ppm }}>
                    <span className="-ml-1 size-2 rounded-full bg-champagne-600" />
                    <span className="h-[2px] flex-1 bg-champagne-600" />
                  </div>
                )}
                {dayItems.map(({ a, lane, lanes }) => {
                  const top = (minutesOf(a.startTime) - gridStart) * ppm;
                  const h = Math.max(30, a.durationMinutes * ppm - 2);
                  const meta = STATUS_META[a.status];
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onOpen(a.id)}
                      className={cn(
                        'absolute z-10 overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-left shadow-[0_1px_2px_rgb(15_24_40/0.08)] transition-shadow hover:z-30 hover:shadow-lift focus-visible:z-30',
                        meta.block,
                        SERVICE_BORDER[a.serviceType.color],
                        a.status === 'cancelled' && 'opacity-60',
                      )}
                      style={{ top: top + 1, height: h, left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)` }}
                      aria-label={`${a.startTime} às ${a.endTime}, ${a.clientName}, ${a.serviceType.name}, ${meta.label}`}
                    >
                      <span className="tabular block truncate text-[11px] font-semibold text-ink-soft">
                        {a.startTime}
                        {!multi && ` – ${a.endTime}`}
                      </span>
                      <span className={cn('block truncate text-[13px] font-semibold leading-tight text-ink', a.status === 'cancelled' && 'line-through')}>{a.clientName}</span>
                      {h > 56 && <span className="block truncate text-[12px] text-muted">{multi ? a.neighborhood : `${a.serviceType.name} · ${a.neighborhood}`}</span>}
                      {!multi && h > 76 && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-soft">
                          <span className={cn('size-1.5 rounded-full', meta.dot)} aria-hidden="true" /> {meta.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {!multi && !loading && items.length === 0 && (
        <p className="border-t border-line px-4 py-3 text-[13px] text-muted">Nenhum atendimento neste dia. Toque em um horário vazio para agendar.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Semana no celular: faixa de dias + lista
// ---------------------------------------------------------------------------

function WeekList({
  days,
  date,
  items,
  counts,
  onPick,
  onOpen,
  onCreate,
}: {
  days: string[];
  date: string;
  items: AppointmentDTO[];
  counts: Record<string, number>;
  onPick: (d: string) => void;
  onOpen: (id: string) => void;
  onCreate: (d: string) => void;
}) {
  const today = todayISO();
  const selected = days.includes(date) ? date : days[0]!;
  const dayItems = items.filter((a) => a.date === selected);
  return (
    <div>
      <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Dias da semana">
        {days.map((d) => {
          const active = d === selected;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onPick(d)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg border py-2 transition-colors',
                active ? 'border-navy-900 bg-navy-900 text-porcelain' : 'border-line bg-paper text-ink',
                d === today && !active && 'border-champagne-500',
              )}
            >
              <span className={cn('text-[10px] font-semibold uppercase', active ? 'text-champagne-400' : 'text-subtle')}>{formatWeekdayShort(d)}</span>
              <span className="tabular text-[16px] font-semibold">{Number(d.slice(8))}</span>
              <span className={cn('tabular h-4 text-[10px]', active ? 'text-porcelain/70' : 'text-muted')}>{counts[d] ? counts[d] : ''}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-ink">{capitalize(formatLongDate(selected))}</h2>
        <Button size="sm" variant="secondary" onClick={() => onCreate(selected)}>
          <Plus className="size-4" aria-hidden="true" /> Agendar
        </Button>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {dayItems.length ? (
          dayItems.map((a) => <AppointmentCard key={a.id} a={a} onOpen={() => onOpen(a.id)} />)
        ) : (
          <EmptyState title="Dia livre" description="Nenhum atendimento neste dia." className="rounded-lg border border-dashed border-line-strong py-8" />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mês
// ---------------------------------------------------------------------------

function MonthView({
  date,
  days,
  items,
  desktop,
  onPickDay,
  onOpen,
}: {
  date: string;
  days: string[];
  items: AppointmentDTO[];
  desktop: boolean;
  onPickDay: (d: string) => void;
  onOpen: (id: string) => void;
}) {
  const today = todayISO();
  const byDay = useMemo(() => {
    const map: Record<string, AppointmentDTO[]> = {};
    for (const a of items) (map[a.date] ??= []).push(a);
    return map;
  }, [items]);
  const selectedItems = byDay[date] ?? [];
  const month = date.slice(0, 7);

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-line bg-paper">
        <div className="grid grid-cols-7 border-b border-line">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
            <span key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-subtle">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const list = byDay[d] ?? [];
            const active = list.filter((a) => a.status !== 'cancelled');
            const outside = d.slice(0, 7) !== month;
            const isSelected = !desktop && d === date;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onPickDay(d)}
                aria-label={`${capitalize(formatLongDate(d))}: ${active.length} atendimento${active.length === 1 ? '' : 's'}`}
                aria-pressed={!desktop ? isSelected : undefined}
                className={cn(
                  'flex min-h-16 flex-col items-stretch gap-1 border-line p-1.5 text-left transition-colors hover:bg-champagne-100/50 sm:min-h-24 sm:p-2 lg:min-h-28',
                  i % 7 !== 0 && 'border-l',
                  i >= 7 && 'border-t',
                  outside && 'bg-ink/[0.02]',
                  isSelected && 'bg-champagne-100',
                )}
              >
                <span
                  className={cn(
                    'tabular inline-flex size-7 items-center justify-center self-start rounded-full text-[13px] font-semibold',
                    outside ? 'text-subtle/70' : 'text-ink-soft',
                    d === today && 'bg-navy-900 text-porcelain',
                  )}
                >
                  {Number(d.slice(8))}
                </span>
                {desktop ? (
                  <span className="flex flex-col gap-0.5">
                    {list.slice(0, 3).map((a) => (
                      <span
                        key={a.id}
                        role="link"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(a.id);
                        }}
                        className={cn('flex items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-ink', STATUS_META[a.status].block, a.status === 'cancelled' && 'line-through opacity-70')}
                      >
                        <span className="tabular font-semibold">{a.startTime}</span>
                        <span className="truncate">{a.clientName}</span>
                      </span>
                    ))}
                    {list.length > 3 && <span className="px-1.5 text-[11px] font-semibold text-steel-600">+{list.length - 3} mais</span>}
                  </span>
                ) : (
                  active.length > 0 && (
                    <span className="flex flex-wrap items-center gap-0.5 px-0.5" aria-hidden="true">
                      {active.slice(0, 3).map((a) => (
                        <span key={a.id} className={cn('size-1.5 rounded-full', STATUS_META[a.status].dot)} />
                      ))}
                      {active.length > 3 && <span className="text-[9px] font-semibold text-muted">+{active.length - 3}</span>}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>
      </div>
      {!desktop && (
        <div className="mt-5">
          <h2 className="text-[15px] font-semibold text-ink">{capitalize(formatLongDate(date))}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {selectedItems.length ? (
              selectedItems.map((a) => <AppointmentCard key={a.id} a={a} onOpen={() => onOpen(a.id)} />)
            ) : (
              <EmptyState title="Dia livre" description="Toque em outro dia para ver os atendimentos." className="rounded-lg border border-dashed border-line-strong py-8" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
