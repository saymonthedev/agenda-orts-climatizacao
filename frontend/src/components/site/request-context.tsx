'use client';

import type { PublicProfileDTO } from '@orts/backend/contracts';
import dynamic from 'next/dynamic';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// O formulário só é baixado quando o visitante pede um atendimento.
const RequestDialog = dynamic(() => import('./request-dialog').then((m) => m.RequestDialog), { ssr: false });

type RequestContextValue = {
  profile: PublicProfileDTO;
  openRequest: (serviceId?: string) => void;
};

const RequestContext = createContext<RequestContextValue | null>(null);

/** Disponibiliza o perfil público e o formulário de solicitação para todo o site. */
export function SiteProvider({ profile, children }: { profile: PublicProfileDTO; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [serviceId, setServiceId] = useState<string | undefined>();
  const openRequest = useCallback((id?: string) => {
    setServiceId(id);
    setMounted(true);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ profile, openRequest }), [profile, openRequest]);
  return (
    <RequestContext.Provider value={value}>
      {children}
      {mounted && <RequestDialog open={open} onOpenChange={setOpen} profile={profile} serviceId={serviceId} />}
    </RequestContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(RequestContext);
  if (!ctx) throw new Error('useSite deve ser usado dentro de <SiteProvider>.');
  return ctx;
}
