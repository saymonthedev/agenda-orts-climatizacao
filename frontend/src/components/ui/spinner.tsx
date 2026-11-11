import { cn } from '@/lib/cn';

export function Spinner({ className, label = 'Carregando' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex size-4 items-center justify-center', className)}>
      <svg viewBox="0 0 24 24" className="size-full animate-spin" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}
