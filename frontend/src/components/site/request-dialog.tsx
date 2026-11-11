'use client';

import type { PublicProfileDTO } from '@orts/backend/contracts';
import { Dialog } from '@/components/ui/dialog';
import { RequestForm } from './request-form';

export function RequestDialog({
  open,
  onOpenChange,
  profile,
  serviceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: PublicProfileDTO;
  serviceId?: string;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Solicitar atendimento"
      description="Conte o que você precisa. A mensagem fica pronta para enviar pelo WhatsApp."
      size="md"
    >
      <RequestForm key={`${serviceId ?? 'geral'}-${open}`} profile={profile} initialService={serviceId} />
    </Dialog>
  );
}
