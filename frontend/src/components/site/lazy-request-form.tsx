'use client';

import type { PublicProfileDTO } from '@orts/backend/contracts';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const RequestForm = dynamic(() => import('./request-form').then((m) => m.RequestForm), {
  ssr: false,
  loading: () => <FormPlaceholder />,
});

function FormPlaceholder() {
  return (
    <div aria-hidden="true" className="flex min-h-[560px] flex-col gap-5">
      {[44, 44, 36, 96, 52].map((h, i) => (
        <div key={i} className="skeleton rounded-md" style={{ height: h }} />
      ))}
    </div>
  );
}

/** Carrega o formulário (e seus componentes) só quando a seção de contato se aproxima. */
export function LazyRequestForm({ profile }: { profile: PublicProfileDTO }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return setVisible(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref}>{visible ? <RequestForm profile={profile} /> : <FormPlaceholder />}</div>;
}
