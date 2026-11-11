'use client';

import type { AppointmentDTO, AppointmentStatus } from '@orts/backend/contracts';
import { APPOINTMENT_STATUSES } from '@orts/backend/contracts';
import { Search, SearchX, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointmentsSearch } from '@/hooks/admin/queries';
import { cn } from '@/lib/cn';
import { addDays, capitalize, formatLongDate, startOfMonth, todayISO, daysInMonth } from '@/lib/format';
import { useAdminUI } from './admin-ui';
import { AppointmentCard } from './appointment-card';
import { PageHeader } from './shell';
import { STATUS_META } from './status';

type Preset = 'upcoming' | 'today' | 'week' | 'month' | 'all' | 'custom';

function presetRange(preset: Preset): { from?: string; to?: string } {
  const today = todayISO();
  switch (preset) {
    case 'upcoming':
      return { from: today };
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: today, to: addDays(today, 6) };
    case 'month': {
      const first = startOfMonth(today);
      return { from: first, to: `${first.slice(0, 8)}${String(daysInMonth(first)).padStart(2, '0')}` };
    }
    default:
      return {};
  }
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'upcoming', label: 'Próximos' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: '7 dias' },
  { value: 'month', label: 'Este mês' },
  { value: 'all', label: 'Todos' },
];

export function AppointmentsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { openDetails } = useAdminUI();
  const initialStatus = (params.get('status')?.split(',') ?? []).filter((s): s is AppointmentStatus => (APPOINTMENT_STATUSES as readonly string[]).includes(s));

  const [term, setTerm] = useState(params.get('q') ?? '');
  const [search, setSearch] = useState(term);
  const [statuses, setStatuses] = useState<AppointmentStatus[]>(initialStatus);
  const [preset, setPreset] = useState<Preset>(initialStatus.length ? 'all' : 'upcoming');
  const [custom, setCustom] = useState<{ from?: string; to?: string }>({});
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // busca com atraso para não consultar a cada tecla
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(term.trim()), 300);
    return () => window.clearTimeout(t);
  }, [term]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (search) sp.set('q', search);
    if (statuses.length) sp.set('status', statuses.join(','));
    const qs = sp.toString();
    router.replace(`/admin/atendimentos${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [search, statuses, router]);

  const range = preset === 'custom' ? custom : presetRange(preset);
  const result = useAppointmentsSearch({ search: search || undefined, status: statuses, from: range.from, to: range.to, order });
  const items = useMemo(() => result.data?.pages.flatMap((p) => p.items) ?? [], [result.data]);
  const total = result.data?.pages[0]?.total ?? 0;

  const groups = useMemo(() => {
    const map = new Map<string, AppointmentDTO[]>();
    for (const a of items) map.set(a.date, [...(map.get(a.date) ?? []), a]);
    return [...map.entries()];
  }, [items]);

  const toggleStatus = (s: AppointmentStatus) => setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const hasFilters = Boolean(search || statuses.length || preset !== 'upcoming');

  return (
    <>
      <PageHeader title="Atendimentos" subtitle="Pesquise clientes e filtre por data e status." />
      <div className="flex flex-col gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 rounded-lg border border-line bg-paper p-4 sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label="Pesquisar atendimentos"
              placeholder="Buscar por cliente, telefone, endereço, bairro ou serviço"
              className="h-12 w-full rounded-md border border-line-strong bg-white pl-10 pr-11 text-[15px] outline-none transition-[border-color,box-shadow] placeholder:text-subtle/80 focus:border-navy-700 focus:shadow-[0_0_0_3px_rgb(191_159_99/0.28)]"
            />
            {term && (
              <button
                type="button"
                onClick={() => setTerm('')}
                className="absolute right-1.5 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-subtle hover:bg-ink/[0.06] hover:text-ink"
                aria-label="Limpar busca"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1" role="group" aria-label="Período">
              {[...PRESETS, { value: 'custom' as Preset, label: 'Personalizado' }].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={preset === p.value}
                  onClick={() => setPreset(p.value)}
                  className={cn(
                    'h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
                    preset === p.value ? 'border-navy-900 bg-navy-900 text-porcelain' : 'border-line-strong text-ink-soft hover:border-ink-soft',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Segmented
              label="Ordem por data"
              hideLabel
              size="sm"
              value={order}
              onChange={setOrder}
              fullWidth
              className="lg:w-72"
              options={[
                { value: 'asc', label: 'Mais antigos' },
                { value: 'desc', label: 'Mais recentes' },
              ]}
            />
          </div>

          {preset === 'custom' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <DatePicker label="De" value={custom.from ?? null} onChange={(d) => setCustom((c) => ({ ...c, from: d }))} size="sm" />
              <DatePicker label="Até" value={custom.to ?? null} onChange={(d) => setCustom((c) => ({ ...c, to: d }))} min={custom.from} size="sm" />
            </div>
          )}

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
            {APPOINTMENT_STATUSES.map((s) => {
              const meta = STATUS_META[s];
              const on = statuses.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleStatus(s)}
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition-colors',
                    on ? cn(meta.pill, 'border-transparent') : 'border-line-strong text-ink-soft hover:border-ink-soft',
                  )}
                >
                  <span className={cn('size-2 rounded-full', meta.dot)} aria-hidden="true" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-muted" aria-live="polite">
            {result.isLoading ? 'Buscando…' : `${total} atendimento${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setTerm('');
                setStatuses([]);
                setPreset('upcoming');
                setCustom({});
              }}
              className="text-[13px] font-semibold text-steel-600 hover:text-ink"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {result.isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title="Nenhum atendimento encontrado"
            description={search ? 'Tente outro nome, telefone ou bairro.' : 'Ajuste o período ou os filtros de status.'}
            className="rounded-lg border border-dashed border-line-strong"
          />
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map(([date, list]) => (
              <section key={date} aria-label={capitalize(formatLongDate(date))}>
                <h2 className="sticky top-[calc(56px+env(safe-area-inset-top))] z-10 -mx-1 mb-2 bg-porcelain/95 px-1 py-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-steel-600 backdrop-blur lg:top-0">
                  {capitalize(formatLongDate(date))}
                  {date.slice(0, 4) !== todayISO().slice(0, 4) && ` de ${date.slice(0, 4)}`}
                </h2>
                <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                  {list.map((a) => (
                    <AppointmentCard key={a.id} a={a} onOpen={() => openDetails(a.id)} />
                  ))}
                </div>
              </section>
            ))}
            {result.hasNextPage && (
              <Button variant="secondary" onClick={() => result.fetchNextPage()} loading={result.isFetchingNextPage} className="self-center">
                Carregar mais
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
