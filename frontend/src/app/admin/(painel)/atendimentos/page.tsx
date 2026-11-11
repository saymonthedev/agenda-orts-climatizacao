import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppointmentsScreen } from '@/components/admin/appointments-screen';

export const metadata: Metadata = { title: 'Atendimentos' };

export default function AppointmentsPage() {
  return (
    <Suspense>
      <AppointmentsScreen />
    </Suspense>
  );
}
