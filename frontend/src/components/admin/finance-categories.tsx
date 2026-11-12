'use client';

import type { FinanceCategoryDTO, FinanceKind } from '@orts/backend/contracts';
import { ArchiveRestore, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { TextField } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useDeleteFinanceCategory, useFinanceCategories, useSaveFinanceCategory } from '@/hooks/admin/queries';
import { useAutosave } from '@/hooks/use-autosave';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';

/** Categorias de entradas e saídas: renomear salva sozinho; excluir pede confirmação. */
export function FinanceCategoriesManager() {
  const categories = useFinanceCategories();
  return (
    <section className="rounded-lg border border-line bg-paper">
      <div className="border-b border-line px-4 py-4 sm:px-6">
        <h2 className="text-[16px] font-semibold text-ink">Categorias</h2>
        <p className="mt-0.5 text-[14px] leading-relaxed text-muted">Usadas para organizar os lançamentos e os gráficos do Financeiro.</p>
      </div>
      <div className="grid gap-8 p-4 sm:p-6 lg:grid-cols-2">
        {categories.data ? (
          (['income', 'expense'] as const).map((kind) => <CategoryList key={kind} kind={kind} items={categories.data.filter((c) => c.kind === kind)} />)
        ) : (
          <Skeleton className="h-48 lg:col-span-2" />
        )}
      </div>
    </section>
  );
}

function CategoryList({ kind, items }: { kind: FinanceKind; items: FinanceCategoryDTO[] }) {
  const save = useSaveFinanceCategory();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const noun = kind === 'income' ? 'entrada' : 'saída';

  async function add() {
    if (name.trim().length < 2) return setError('Informe o nome da categoria.');
    try {
      await save.mutateAsync({ input: { kind, name: name.trim() } });
      toast.success('Categoria criada.', { description: name.trim() });
      setName('');
      setError(undefined);
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'DUPLICATE' ? 'Já existe uma categoria com esse nome.' : err instanceof ApiError ? err.message : 'Não foi possível criar.');
    }
  }

  return (
    <div>
      <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">
        <span aria-hidden="true" className={cn('size-2.5 rounded-full', kind === 'income' ? 'bg-fin-in' : 'bg-fin-out')} />
        {kind === 'income' ? 'Entradas' : 'Saídas'}
      </h3>
      <ul className="mt-2 divide-y divide-line">
        {items.map((c) => (
          <CategoryRow key={c.id} category={c} />
        ))}
      </ul>
      <div className="mt-3 flex items-end gap-2">
        <TextField
          label={`Nova categoria de ${noun}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void add();
            }
          }}
          error={error}
          containerClassName="min-w-0 flex-1"
          maxLength={60}
          placeholder={kind === 'income' ? 'Ex.: Contratos' : 'Ex.: Aluguel'}
        />
        <Button variant="secondary" onClick={() => void add()} loading={save.isPending} className="shrink-0">
          <Plus className="size-4" aria-hidden="true" /> Adicionar
        </Button>
      </div>
    </div>
  );
}

function CategoryRow({ category }: { category: FinanceCategoryDTO }) {
  const save = useSaveFinanceCategory();
  const remove = useDeleteFinanceCategory();
  const confirm = useConfirm();
  const [name, setName] = useState(category.name);
  const autosave = useAutosave<string>({
    value: name,
    initial: category.name,
    enabled: !category.archived,
    validate: (v): Record<string, string> => (v.trim().length < 2 ? { name: 'Informe o nome da categoria.' } : {}),
    save: (v) => save.mutateAsync({ id: category.id, input: { name: v.trim() } }),
  });
  const error = autosave.errors.name ?? (autosave.status === 'error' ? (autosave.message?.toLowerCase().includes('já existe') ? 'Já existe uma categoria com esse nome.' : (autosave.message ?? undefined)) : undefined);

  async function onDelete() {
    const used = category.entriesCount;
    const ok = await confirm({
      title: used ? `Arquivar a categoria “${category.name}”?` : `Excluir a categoria “${category.name}”?`,
      description: used
        ? `Ela tem ${used} lançamento${used > 1 ? 's' : ''}: o histórico continua, mas ela deixa de aparecer nos lançamentos novos.`
        : 'Ela ainda não tem lançamentos e será excluída.',
      confirmLabel: used ? 'Arquivar' : 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const result = await remove.mutateAsync(category.id);
      toast.success(result.archived ? 'Categoria arquivada.' : 'Categoria excluída.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível excluir.');
    }
  }

  async function restore() {
    try {
      await save.mutateAsync({ id: category.id, input: { archived: false } });
      toast.success('Categoria reativada.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível reativar.');
    }
  }

  return (
    <li className="flex items-start gap-2 py-2.5">
      <TextField
        label={`Nome da categoria ${category.name}`}
        hideLabel
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        disabled={category.archived}
        containerClassName="min-w-0 flex-1"
        maxLength={60}
      />
      <span className="tabular mt-3 hidden w-16 shrink-0 text-right text-[12px] text-subtle sm:block" title="Lançamentos nesta categoria">
        {category.archived ? 'arquivada' : `${category.entriesCount} lanç.`}
      </span>
      {category.archived ? (
        <Button variant="ghost" size="icon" onClick={() => void restore()} aria-label={`Reativar categoria ${category.name}`} title="Reativar">
          <ArchiveRestore className="size-4" aria-hidden="true" />
        </Button>
      ) : (
        <Button variant="danger-ghost" size="icon" onClick={() => void onDelete()} aria-label={`Excluir categoria ${category.name}`} title="Excluir">
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      )}
    </li>
  );
}
