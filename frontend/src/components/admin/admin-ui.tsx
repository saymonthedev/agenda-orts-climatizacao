'use client';

import type { AppointmentDTO, FinanceEntryDTO } from '@orts/backend/contracts';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AppointmentDetails } from './appointment-details';
import { AppointmentForm, type FormPrefill } from './appointment-form';
import { FinanceEntryDialog, type EntryDefaults } from './finance-entry-dialog';

type AdminUI = {
  openCreate: (prefill?: FormPrefill) => void;
  openEdit: (appointment: AppointmentDTO) => void;
  openDetails: (id: string) => void;
  /** Abre um lançamento do financeiro (novo, com valores iniciais, ou existente para editar). */
  openEntry: (options?: { entry?: FinanceEntryDTO; defaults?: EntryDefaults }) => void;
};

const Ctx = createContext<AdminUI | null>(null);

/** Hospeda o formulário e os detalhes do atendimento, acessíveis de qualquer tela. */
export function AdminUIProvider({ children }: { children: ReactNode }) {
  const [form, setForm] = useState<{ open: boolean; appointment?: AppointmentDTO; prefill?: FormPrefill; key: number }>({ open: false, key: 0 });
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const openCreate = useCallback((prefill?: FormPrefill) => setForm((f) => ({ open: true, prefill, key: f.key + 1 })), []);
  const openEdit = useCallback((appointment: AppointmentDTO) => {
    setDetailsId(null);
    setForm((f) => ({ open: true, appointment, key: f.key + 1 }));
  }, []);
  const openDetails = useCallback((id: string) => setDetailsId(id), []);
  const [entry, setEntry] = useState<{ open: boolean; entry?: FinanceEntryDTO; defaults?: EntryDefaults; key: number }>({ open: false, key: 0 });
  const openEntry = useCallback((options?: { entry?: FinanceEntryDTO; defaults?: EntryDefaults }) => setEntry((e) => ({ open: true, ...options, key: e.key + 1 })), []);

  const value = useMemo(() => ({ openCreate, openEdit, openDetails, openEntry }), [openCreate, openEdit, openDetails, openEntry]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <AppointmentForm
        key={form.key}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        appointment={form.appointment}
        prefill={form.prefill}
        onSaved={(a) => setDetailsId(a.id)}
      />
      <AppointmentDetails id={detailsId} onClose={() => setDetailsId(null)} onEdit={openEdit} />
      <FinanceEntryDialog key={`entry-${entry.key}`} open={entry.open} onOpenChange={(open) => setEntry((e) => ({ ...e, open }))} entry={entry.entry} defaults={entry.defaults} />
    </Ctx.Provider>
  );
}

export function useAdminUI() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminUI deve ser usado dentro de <AdminUIProvider>.');
  return ctx;
}
