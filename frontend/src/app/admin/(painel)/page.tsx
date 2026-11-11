import type { Metadata } from 'next';
import { DashboardScreen } from '@/components/admin/dashboard-screen';

export const metadata: Metadata = { title: 'Painel' };

export default function DashboardPage() {
  return <DashboardScreen />;
}
