'use client';

import { RadioGroup } from 'radix-ui';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Option<V extends string> = { value: V; label: ReactNode; ariaLabel?: string };

type SegmentedProps<V extends string> = {
  label: string;
  hideLabel?: boolean;
  value: V;
  onChange: (value: V) => void;
  options: Option<V>[];
  className?: string;
  size?: 'sm' | 'md';
  tone?: 'light' | 'dark';
  fullWidth?: boolean;
};

/** Controle segmentado (grupo de opções exclusivas) com navegação por setas. */
export function Segmented<V extends string>({ label, hideLabel, value, onChange, options, className, size = 'md', tone = 'light', fullWidth }: SegmentedProps<V>) {
  const labelId = useId();
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span id={labelId} className={cn('text-[13px] font-semibold text-ink-soft', hideLabel && 'sr-only')}>
        {label}
      </span>
      <RadioGroup.Root
        aria-labelledby={labelId}
        value={value}
        onValueChange={(v) => onChange(v as V)}
        orientation="horizontal"
        loop
        className={cn(
          'inline-flex rounded-lg p-1',
          tone === 'light' ? 'bg-ink/[0.06]' : 'bg-white/[0.08]',
          fullWidth && 'flex w-full',
        )}
      >
        {options.map((option) => (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
            aria-label={option.ariaLabel}
            className={cn(
              'relative inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-[background-color,color,box-shadow] duration-200',
              size === 'md' ? 'h-9 px-4 text-sm' : 'h-8 px-3 text-[13px]',
              tone === 'light'
                ? 'text-muted hover:text-ink data-[state=checked]:bg-paper data-[state=checked]:text-ink data-[state=checked]:shadow-lift'
                : 'text-porcelain/70 hover:text-porcelain data-[state=checked]:bg-porcelain data-[state=checked]:text-navy-950',
            )}
          >
            {option.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
