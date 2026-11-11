import type { Metadata, Viewport } from 'next';
import { AdminProviders } from '@/components/admin/providers';

export const metadata: Metadata = {
  title: { default: 'Agenda', template: '%s · ORTS Agenda' },
  manifest: '/admin.webmanifest',
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: { capable: true, title: 'ORTS Agenda', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#111c30',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminProviders>{children}</AdminProviders>;
}
