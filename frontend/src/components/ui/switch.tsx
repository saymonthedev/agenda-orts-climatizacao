'use client';

import { Switch as S } from 'radix-ui';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  hideLabel,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  description?: string;
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <S.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-desc` : undefined}
        className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-line-strong transition-colors duration-200 data-[state=checked]:bg-navy-800 disabled:opacity-50"
      >
        <S.Thumb className="block size-5 translate-x-1 rounded-full bg-paper shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-200 data-[state=checked]:translate-x-6" />
      </S.Root>
      <div className={cn('min-w-0', hideLabel && 'sr-only')}>
        <label htmlFor={id} className="text-[14px] font-semibold text-ink">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="text-[13px] leading-snug text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
