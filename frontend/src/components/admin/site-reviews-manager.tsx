'use client';

import type { SiteReviewDTO } from '@orts/backend/contracts';
import { siteReviewInputSchema } from '@orts/backend/contracts';
import { ExternalLink, MessageSquareQuote, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AutosaveIndicator } from '@/components/ui/autosave-indicator';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { TextArea, TextField } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { SITE } from '@/content/site';
import { useDeleteSiteReview, useSaveSiteReview, useSiteReviews } from '@/hooks/admin/queries';
import { useAutosave } from '@/hooks/use-autosave';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { capitalize, formatMonthYear, relativeMonth, todayISO } from '@/lib/format';
import { Section } from './settings-section';

const GOOGLE_PROFILE_URL = `https://www.google.com/maps/place/?q=place_id:${SITE.googlePlaceId}`;

type ReviewForm = { author: string; rating: number; text: string; month: string; visible: boolean };

const monthLabel = (month: string) => capitalize(formatMonthYear(`${month}-01`));

/** Últimos 5 anos, do mês atual para trás. */
function monthOptions(current?: string) {
  const [y, m] = todayISO().split('-').map(Number) as [number, number];
  const values = Array.from({ length: 60 }, (_, i) => {
    const total = y * 12 + (m - 1) - i;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
  });
  if (current && !values.includes(current)) values.push(current);
  return values.map((v) => ({ value: v, label: monthLabel(v), description: relativeMonth(v) }));
}

const toForm = (r: SiteReviewDTO): ReviewForm => ({ author: r.author, rating: r.rating, text: r.text, month: r.month, visible: r.visible });

function validateReview(v: ReviewForm): Record<string, string> {
  const parsed = siteReviewInputSchema.safeParse(v);
  if (parsed.success) return {};
  const found: Record<string, string> = {};
  for (const issue of parsed.error.issues) found[String(issue.path[0] ?? '_')] ??= issue.message;
  return found;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} aria-hidden="true" className={cn('size-3.5', className, i < value ? 'fill-champagne-500 text-champagne-500' : 'fill-transparent text-line-strong')} />
      ))}
    </span>
  );
}

/** Nota de 1 a 5 em estrelas (grupo de opções acessível). */
function StarInput({ value, onChange, error }: { value: number; onChange: (v: number) => void; error?: string }) {
  return (
    <div>
      <p id="review-rating-label" className="mb-2 text-[13px] font-semibold text-ink-soft">
        Nota
      </p>
      <div role="radiogroup" aria-labelledby="review-rating-label" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={n === 1 ? '1 estrela' : `${n} estrelas`}
            onClick={() => onChange(n)}
            className="grid size-11 place-items-center rounded-md transition-colors hover:bg-steel-100"
          >
            <Star aria-hidden="true" className={cn('size-6 transition-colors', n <= value ? 'fill-champagne-500 text-champagne-500' : 'fill-transparent text-line-strong')} />
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  );
}

function ReviewFields({ value, onChange, errors }: { value: ReviewForm; onChange: (p: Partial<ReviewForm>) => void; errors: Record<string, string> }) {
  return (
    <>
      <TextField label="Nome de quem avaliou" value={value.author} onChange={(e) => onChange({ author: e.target.value })} error={errors.author} maxLength={80} />
      <StarInput value={value.rating} onChange={(rating) => onChange({ rating })} error={errors.rating} />
      <TextArea
        label="Comentário"
        rows={4}
        value={value.text}
        onChange={(e) => onChange({ text: e.target.value })}
        error={errors.text}
        maxLength={1500}
        hint="Copie do Google exatamente como o cliente escreveu."
      />
      <Select
        label="Quando foi publicada"
        value={value.month}
        onChange={(month) => onChange({ month })}
        options={monthOptions(value.month)}
        error={errors.month}
        hint="Pelo tempo que o Google mostra na avaliação (por exemplo, “7 meses atrás”)."
      />
      <Switch checked={value.visible} onCheckedChange={(visible) => onChange({ visible })} label="Mostrar no site" />
    </>
  );
}

/** Criar é uma ação explícita: a avaliação só passa a existir ao confirmar. */
function NewReviewDialog({ onClose }: { onClose: () => void }) {
  const save = useSaveSiteReview();
  const [value, setValue] = useState<ReviewForm>({ author: '', rating: 5, text: '', month: todayISO().slice(0, 7), visible: true });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validateReview(value);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await save.mutateAsync({ input: value });
      toast.success('Avaliação adicionada.', { description: value.visible ? 'Ela já aparece no site.' : 'Ela está oculta no site.' });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        if (!Object.keys(err.fields).length) toast.error(err.message);
      } else toast.error('Não foi possível salvar. Tente novamente.');
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Nova avaliação"
      description="Abra seu perfil no Google, copie o nome, a nota e o comentário, e cole aqui."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="review-form" variant="dark" loading={save.isPending}>
            Adicionar avaliação
          </Button>
        </>
      }
    >
      <form id="review-form" onSubmit={submit} noValidate autoComplete="off" className="flex flex-col gap-5">
        <ReviewFields value={value} onChange={(p) => setValue((v) => ({ ...v, ...p }))} errors={errors} />
      </form>
    </Dialog>
  );
}

/** Editar salva sozinho; fechar a janela envia o que estiver pendente. */
function EditReviewDialog({ review, onClose }: { review: SiteReviewDTO; onClose: () => void }) {
  const save = useSaveSiteReview();
  const [initial] = useState(() => toForm(review));
  const [value, setValue] = useState(initial);
  const autosave = useAutosave<ReviewForm>({
    value,
    initial,
    validate: validateReview,
    save: (v) => save.mutateAsync({ id: review.id, input: v }),
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Editar avaliação"
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
        <ReviewFields value={value} onChange={(p) => setValue((v) => ({ ...v, ...p }))} errors={autosave.errors} />
      </form>
    </Dialog>
  );
}

/**
 * Avaliações exibidas no site. A API do Google entrega a nota e o total, mas não os
 * comentários do perfil da ORTS; aqui o proprietário cadastra os comentários copiados do Google.
 */
export function SiteReviewsManager() {
  const reviews = useSiteReviews();
  const remove = useDeleteSiteReview();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<SiteReviewDTO | 'new' | null>(null);

  async function onDelete(review: SiteReviewDTO) {
    const ok = await confirm({
      title: `Excluir a avaliação de ${review.author}?`,
      description: 'Ela deixa de aparecer no site. A avaliação no Google continua lá.',
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(review.id);
      toast.success('Avaliação excluída.');
    } catch {
      toast.error('Não foi possível excluir. Tente novamente.');
    }
  }

  return (
    <Section
      title="Avaliações no site"
      description="O Google manda para o site só a nota e o total de avaliações. Para os comentários aparecerem, copie cada um do seu perfil no Google e cadastre aqui."
      action={
        <Button asChild variant="secondary" size="sm">
          <a href={GOOGLE_PROFILE_URL} target="_blank" rel="noopener noreferrer">
            Abrir no Google <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </Button>
      }
    >
      {reviews.isLoading ? (
        <Skeleton className="h-40" />
      ) : reviews.data?.length ? (
        <ul className="divide-y divide-line" aria-label="Avaliações cadastradas">
          {reviews.data.map((r) => (
            <li key={r.id} className={cn('flex items-start gap-3.5 py-4', !r.visible && 'opacity-60')}>
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-steel-100 text-[13px] font-semibold text-steel-700">
                {initials(r.author)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <p className="truncate text-[15px] font-semibold text-ink">{r.author}</p>
                  <Stars value={r.rating} />
                  {!r.visible && <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold text-muted">Oculta no site</span>}
                </div>
                <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-ink-soft">“{r.text}”</p>
                <p className="mt-1 text-[12px] text-subtle">
                  {monthLabel(r.month)} · {relativeMonth(r.month)}
                </p>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(r)} aria-label={`Editar a avaliação de ${r.author}`}>
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => void onDelete(r)} aria-label={`Excluir a avaliação de ${r.author}`}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<MessageSquareQuote />}
          title="Nenhum comentário cadastrado"
          description="Os comentários que você cadastrar aqui aparecem no site, junto com a nota do Google."
          className="py-8"
        />
      )}
      <Button variant="secondary" className="mt-4" onClick={() => setEditing('new')}>
        <Plus className="size-4" aria-hidden="true" /> Nova avaliação
      </Button>
      {editing === 'new' && <NewReviewDialog onClose={() => setEditing(null)} />}
      {editing && editing !== 'new' && <EditReviewDialog review={editing} onClose={() => setEditing(null)} />}
    </Section>
  );
}
