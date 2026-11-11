'use client';

import type { ReactNode } from 'react';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/button';
import { useSite } from './request-context';

export function RequestButton({
  children,
  serviceId,
  variant = 'primary',
  size = 'md',
  className,
}: {
  children: ReactNode;
  serviceId?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { openRequest } = useSite();
  return (
    <Button variant={variant} size={size} className={className} onClick={() => openRequest(serviceId)}>
      {children}
    </Button>
  );
}
