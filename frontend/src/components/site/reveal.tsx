'use client';

import { useEffect } from 'react';

/**
 * Ativa a revelação suave dos elementos marcados com [data-reveal] ao rolar.
 * Sem JavaScript (ou com movimento reduzido), o conteúdo aparece normalmente.
 */
export function RevealController() {
  useEffect(() => {
    const root = document.documentElement;
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((el) => (el.dataset.visible = 'true'));
      return;
    }
    // elementos já visíveis não devem piscar
    const vh = window.innerHeight;
    elements.forEach((el) => {
      if (el.getBoundingClientRect().top < vh * 0.92) el.dataset.visible = 'true';
    });
    root.classList.add('js');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = 'true';
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    elements.filter((el) => el.dataset.visible !== 'true').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return null;
}
