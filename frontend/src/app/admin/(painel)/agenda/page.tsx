import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AgendaScreen } from '@/components/admin/agenda-screen';

export const metadata: Metadata = { title: 'Agenda' };

export default function AgendaPage() {
  return (
    <Suspense>
      <AgendaScreen />
    </Suspense>
  );
}
