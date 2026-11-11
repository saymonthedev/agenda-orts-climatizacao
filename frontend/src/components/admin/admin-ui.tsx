'use client';

import type { AppointmentDTO } from '@orts/backend/contracts';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AppointmentDetails } from './appointment-details';
import { AppointmentForm, type FormPrefill } from './appointment-form';

type AdminUI = {
  openCreate: (prefill?: FormPrefill) => void;
  openEdit: (appointment: AppointmentDTO) => void;
  openDetails: (id: string) => void;
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

  const value = useMemo(() => ({ openCreate, openEdit, openDetails }), [openCreate, openEdit, openDetails]);

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
    </Ctx.Provider>
  );
}

export function useAdminUI() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminUI deve ser usado dentro de <AdminUIProvider>.');
  return ctx;
}
