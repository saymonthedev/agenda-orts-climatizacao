'use client';

import type { PublicProfileDTO } from '@orts/backend/contracts';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { RequestDialog } from './request-dialog';

type RequestContextValue = {
  profile: PublicProfileDTO;
  openRequest: (serviceId?: string) => void;
};

const RequestContext = createContext<RequestContextValue | null>(null);

/** Disponibiliza o perfil público e o formulário de solicitação para todo o site. */
export function SiteProvider({ profile, children }: { profile: PublicProfileDTO; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState<string | undefined>();
  const openRequest = useCallback((id?: string) => {
    setServiceId(id);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ profile, openRequest }), [profile, openRequest]);
  return (
    <RequestContext.Provider value={value}>
      {children}
      <RequestDialog open={open} onOpenChange={setOpen} profile={profile} serviceId={serviceId} />
    </RequestContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(RequestContext);
  if (!ctx) throw new Error('useSite deve ser usado dentro de <SiteProvider>.');
  return ctx;
}
