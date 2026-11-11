'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { whatsappLink } from '@/lib/links';
import { WhatsAppIcon } from './icons';
import { useSite } from './request-context';

/** Atalho flutuante para o WhatsApp (aparece depois da primeira dobra). */
export function FloatingWhatsApp() {
  const { profile } = useSite();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const nearEnd = window.innerHeight + window.scrollY > document.body.scrollHeight - 520;
      setVisible(window.scrollY > window.innerHeight * 0.8 && !nearEnd);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!profile.whatsapp) return null;
  return (
    <a
      href={whatsappLink(profile.whatsapp, `Olá, ${profile.businessName}! Gostaria de solicitar um atendimento.`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Conversar no WhatsApp"
      tabIndex={visible ? 0 : -1}
      className={cn(
        'fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-14 items-center gap-2.5 rounded-full bg-navy-900 pl-4 pr-5 text-sm font-semibold text-porcelain shadow-pop transition-all duration-300 hover:bg-navy-800 sm:right-6',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-champagne-400 text-navy-950">
        <WhatsAppIcon className="size-[18px]" />
      </span>
      WhatsApp
    </a>
  );
}
