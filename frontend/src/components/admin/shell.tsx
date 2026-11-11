'use client';

import { CalendarDays, ExternalLink, LayoutDashboard, ListChecks, LogOut, Plus, Settings, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DropdownMenu } from 'radix-ui';
import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LogoHorizontal, Monogram } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { useMe } from '@/hooks/admin/queries';
import { api, setUnauthorizedHandler } from '@/lib/api';
import { cn } from '@/lib/cn';
import { DEVELOPER } from '@/lib/site';
import { AdminUIProvider, useAdminUI } from './admin-ui';

const NAV: { href: string; label: string; short: string; icon: LucideIcon }[] = [
  { href: '/admin', label: 'Painel', short: 'Painel', icon: LayoutDashboard },
  { href: '/admin/agenda', label: 'Agenda', short: 'Agenda', icon: CalendarDays },
  { href: '/admin/atendimentos', label: 'Atendimentos', short: 'Lista', icon: ListChecks },
  { href: '/admin/configuracoes', label: 'Configurações', short: 'Ajustes', icon: Settings },
];

const isActive = (pathname: string, href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

function useLogout() {
  const router = useRouter();
  const qc = useQueryClient();
  return async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* mesmo com erro, encerra localmente */
    }
    qc.clear();
    router.replace('/admin/login');
    toast.info('Você saiu do painel.');
  };
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();

  useEffect(() => {
    const redirect = () => router.replace(`/admin/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    setUnauthorizedHandler(redirect);
    return () => setUnauthorizedHandler(null);
  }, [router]);

  useEffect(() => {
    if (me.isError) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [me.isError, router, pathname]);

  if (!me.data) {
    return (
      <div className="on-dark flex min-h-dvh flex-col items-center justify-center gap-5 bg-navy-900 text-porcelain" aria-busy="true">
        <Monogram variant="negative" className="size-14" />
        <Spinner className="size-5 text-champagne-400" label="Carregando o painel" />
      </div>
    );
  }

  return (
    <AdminUIProvider>
      <div className="min-h-dvh bg-porcelain lg:grid lg:grid-cols-[256px_1fr]">
        <Sidebar name={me.data.name} username={me.data.username} />
        <div className="flex min-w-0 flex-col">
          <MobileTopBar name={me.data.name} />
          <main id="conteudo" className="flex-1 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-10">
            {children}
          </main>
        </div>
        <BottomBar />
      </div>
    </AdminUIProvider>
  );
}

function Sidebar({ name, username }: { name: string; username: string }) {
  const pathname = usePathname();
  const { openCreate } = useAdminUI();
  const logout = useLogout();
  return (
    <aside className="on-dark sticky top-0 hidden h-dvh flex-col bg-navy-950 text-porcelain lg:flex">
      <div className="px-6 pb-6 pt-7">
        <Link href="/admin" aria-label="Painel ORTS">
          <LogoHorizontal variant="negative" className="h-[30px]" />
        </Link>
      </div>
      <div className="px-4">
        <Button className="w-full" onClick={() => openCreate()}>
          <Plus className="size-4" aria-hidden="true" /> Novo agendamento
        </Button>
      </div>
      <nav aria-label="Painel" className="mt-6 flex-1 px-3">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex h-11 items-center gap-3 rounded-md px-3 text-[14px] font-medium transition-colors',
                    active ? 'bg-white/[0.08] text-porcelain' : 'text-porcelain/65 hover:bg-white/[0.04] hover:text-porcelain',
                  )}
                >
                  {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-champagne-400" />}
                  <Icon className={cn('size-[18px]', active ? 'text-champagne-400' : '')} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-champagne-400 text-[13px] font-bold text-navy-950">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">{name}</p>
            <p className="truncate text-[12px] text-porcelain/50">@{username}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex size-9 items-center justify-center rounded-md text-porcelain/60 hover:bg-white/10 hover:text-porcelain"
            aria-label="Sair do painel"
            title="Sair"
          >
            <LogOut className="size-[18px]" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-4 text-[11px] text-porcelain/60">
          Desenvolvido por{' '}
          <a href={DEVELOPER.url} target="_blank" rel="noopener" className="hover:text-porcelain">
            {DEVELOPER.name}
          </a>
        </p>
      </div>
    </aside>
  );
}

function MobileTopBar({ name }: { name: string }) {
  const logout = useLogout();
  return (
    <header className="on-dark sticky top-0 z-40 flex h-[calc(56px+env(safe-area-inset-top))] items-end bg-navy-950 px-4 pb-2 pt-[env(safe-area-inset-top)] text-porcelain lg:hidden">
      <div className="flex h-10 w-full items-center justify-between">
        <Link href="/admin" aria-label="Painel ORTS">
          <LogoHorizontal variant="negative" className="h-[26px]" />
        </Link>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className="inline-flex size-10 items-center justify-center rounded-full bg-champagne-400 text-[14px] font-bold text-navy-950"
            aria-label="Menu da conta"
          >
            {name.slice(0, 1).toUpperCase()}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-[80] min-w-[220px] rounded-lg border border-line bg-paper p-1.5 text-ink shadow-pop data-[state=open]:animate-pop-in"
            >
              <DropdownMenu.Label className="px-3 py-2 text-[13px] text-muted">
                Conectado como <span className="font-semibold text-ink">{name}</span>
              </DropdownMenu.Label>
              <DropdownMenu.Separator className="my-1 h-px bg-line" />
              <DropdownMenu.Item asChild className="flex h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 text-[14px] outline-none data-[highlighted]:bg-champagne-100">
                <a href="/" target="_blank" rel="noopener">
                  <ExternalLink className="size-4 text-muted" aria-hidden="true" /> Ver site
                </a>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={logout}
                className="flex h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 text-[14px] text-danger outline-none data-[highlighted]:bg-danger-bg"
              >
                <LogOut className="size-4" aria-hidden="true" /> Sair
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}

function BottomBar() {
  const pathname = usePathname();
  const { openCreate } = useAdminUI();
  const items = [NAV[0]!, NAV[1]!, null, NAV[2]!, NAV[3]!];
  return (
    <nav
      aria-label="Painel"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-18px_rgb(15_24_40/0.35)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid h-[68px] max-w-lg grid-cols-5 items-center">
        {items.map((item, i) =>
          item ? (
            <li key={item.href} className="flex justify-center">
              <Link
                href={item.href}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                className={cn(
                  'flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                  isActive(pathname, item.href) ? 'text-navy-900' : 'text-subtle hover:text-ink',
                )}
              >
                <item.icon className={cn('size-[22px]', isActive(pathname, item.href) && 'text-champagne-700')} aria-hidden="true" />
                {item.short}
              </Link>
            </li>
          ) : (
            <li key={`novo-${i}`} className="flex justify-center">
              <button
                type="button"
                onClick={() => openCreate()}
                className="-mt-7 inline-flex size-14 items-center justify-center rounded-2xl bg-navy-900 text-champagne-400 shadow-pop ring-4 ring-paper transition-transform active:scale-95"
                aria-label="Novo agendamento"
              >
                <Plus className="size-7" aria-hidden="true" />
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

/** Cabeçalho padrão das telas do painel. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-5 pt-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:pb-7 lg:pt-10">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-ink [font-stretch:94%] lg:text-[2.1rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
