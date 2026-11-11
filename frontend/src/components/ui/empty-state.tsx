import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full border border-line-strong text-steel-500 [&_svg]:size-5">{icon}</span>}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
