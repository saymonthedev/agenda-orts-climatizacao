'use client';

import { ArrowUpRight, Menu, Phone, X } from 'lucide-react';
import { Dialog as D } from 'radix-ui';
import { useEffect, useState } from 'react';
import { LogoSwap, LogoHorizontal } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { navigation } from '@/content/site';
import { cn } from '@/lib/cn';
import { formatPhone } from '@/lib/format';
import { telLink, whatsappLink } from '@/lib/links';
import { InstagramIcon, WhatsAppIcon } from './icons';
import { useSite } from './request-context';

function useScrollState() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const sections = navigation
      .map((n) => document.querySelector<HTMLElement>(n.href))
      .filter((el): el is HTMLElement => Boolean(el));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(`#${entry.target.id}`);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);
  return { scrolled, active };
}

export function Header() {
  const { scrolled, active } = useScrollState();
  const { openRequest } = useSite();
  const dark = !scrolled;

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300',
        scrolled ? 'border-b border-line bg-porcelain/90 shadow-[0_8px_24px_-20px_rgb(15_24_40/0.4)] backdrop-blur-md' : 'border-b border-transparent',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
        <a href="#inicio" className="-ml-1 flex h-9 items-center rounded-md p-1" aria-label="ORTS Climatização — voltar ao início">
          <LogoSwap dark={dark} className="h-7 sm:h-8 lg:h-9" />
        </a>

        <nav aria-label="Navegação principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navigation.map((item) => {
              const current = active === item.href;
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-current={current ? 'location' : undefined}
                    className={cn(
                      'relative inline-flex h-10 items-center rounded-md px-3.5 text-[14px] font-medium transition-colors',
                      'after:absolute after:inset-x-3.5 after:bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:transition-transform after:duration-300',
                      'hover:after:scale-x-100',
                      current && 'after:scale-x-100',
                      dark ? 'text-porcelain/80 after:bg-champagne-400 hover:text-porcelain' : 'text-ink-soft after:bg-steel-500 hover:text-ink',
                      current && (dark ? 'text-porcelain' : 'text-ink'),
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button size="sm" variant={dark ? 'primary' : 'dark'} className="hidden h-10 px-4 sm:inline-flex" onClick={() => openRequest()}>
            Agendar atendimento
          </Button>
          <MobileMenu dark={dark} />
        </div>
      </div>
    </header>
  );
}

function MobileMenu({ dark }: { dark: boolean }) {
  const [open, setOpen] = useState(false);
  const { openRequest, profile } = useSite();

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Trigger
        className={cn(
          'inline-flex size-11 items-center justify-center rounded-md transition-colors lg:hidden',
          dark ? 'text-porcelain hover:bg-white/10' : 'text-ink hover:bg-ink/[0.06]',
        )}
        aria-label="Abrir menu"
      >
        <Menu className="size-6" aria-hidden="true" />
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-navy-950/60 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out lg:hidden" />
        <D.Content
          className="on-dark fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-navy-950 text-porcelain outline-none data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out lg:hidden"
          aria-describedby={undefined}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_45%_at_85%_0%,rgb(214_197_160/0.16),transparent_70%)]" />
          <div className="container-page relative flex h-16 shrink-0 items-center justify-between">
            <D.Title className="sr-only">Menu</D.Title>
            <LogoHorizontal variant="negative" className="h-7 sm:h-8" />
            <D.Close className="-mr-1.5 inline-flex size-11 items-center justify-center rounded-md hover:bg-white/10" aria-label="Fechar menu">
              <X className="size-6" aria-hidden="true" />
            </D.Close>
          </div>
          <nav aria-label="Navegação principal" className="container-page relative mt-6 flex-1">
            <ol className="flex flex-col">
              {navigation.map((item, i) => (
                <li
                  key={item.href}
                  className="border-b border-white/10 motion-safe:animate-[pop-in_520ms_var(--ease-out-expo)_both]"
                  style={{ animationDelay: `${60 + i * 55}ms` }}
                >
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="group flex items-baseline justify-between gap-4 py-4 text-[2rem] font-semibold leading-tight tracking-[-0.02em] [font-stretch:92%]"
                  >
                    <span>{item.label}</span>
                    <span className="serif-accent text-base text-champagne-400/80">{String(i + 1).padStart(2, '0')}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="container-page relative flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8">
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                setOpen(false);
                openRequest();
              }}
            >
              Agendar atendimento
            </Button>
            <div className="grid grid-cols-2 gap-3">
              {profile.whatsapp && (
                <Button asChild variant="outline-light" size="md">
                  <a href={whatsappLink(profile.whatsapp)} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon className="size-4" /> WhatsApp
                  </a>
                </Button>
              )}
              {profile.phone && (
                <Button asChild variant="outline-light" size="md">
                  <a href={telLink(profile.phone)} aria-label={`Ligar para ${formatPhone(profile.phone)}`}>
                    <Phone className="size-4" aria-hidden="true" /> Ligar
                  </a>
                </Button>
              )}
              {profile.instagramUrl && (
                <Button asChild variant="outline-light" size="md">
                  <a href={profile.instagramUrl} target="_blank" rel="noopener noreferrer">
                    <InstagramIcon className="size-4" /> Instagram <ArrowUpRight className="size-3.5 opacity-60" aria-hidden="true" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
