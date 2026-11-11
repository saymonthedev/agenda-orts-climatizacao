import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginScreen } from '@/components/admin/login-screen';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
