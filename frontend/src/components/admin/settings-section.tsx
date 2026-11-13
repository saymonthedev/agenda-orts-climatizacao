import type { ReactNode } from 'react';

/** Bloco com título usado nas abas de configurações. */
export function Section({ title, description, action, children }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-paper">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-[14px] leading-relaxed text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
