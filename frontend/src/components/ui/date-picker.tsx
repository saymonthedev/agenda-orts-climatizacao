'use client';

import { CalendarDays, ChevronDown } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { capitalize, formatLongDate, todayISO } from '@/lib/format';
import { Calendar } from './calendar';
import { controlClasses, Field } from './field';

type DatePickerProps = {
  label: string;
  value: string | null;
  onChange: (date: string) => void;
  error?: string;
  hint?: string;
  min?: string;
  placeholder?: string;
  className?: string;
  hideLabel?: boolean;
  markers?: Record<string, number>;
  size?: 'md' | 'sm';
};

/** Seletor de data com calendário próprio (sem o date picker nativo). */
export function DatePicker({ label, value, onChange, error, hint, min, placeholder = 'Escolha a data', className, hideLabel, markers, size = 'md' }: DatePickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const year = value && value.slice(0, 4) !== todayISO().slice(0, 4) ? ` de ${value.slice(0, 4)}` : '';
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} className={className} hideLabel={hideLabel}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          id={id}
          aria-invalid={error ? true : undefined}
          className={cn(
            controlClasses(Boolean(error)),
            'group flex items-center gap-2.5 px-3.5 text-left',
            size === 'md' ? 'h-11' : 'h-9 text-sm',
            !value && 'text-subtle',
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-steel-500" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{value ? `${capitalize(formatLongDate(value))}${year}` : placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-subtle transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            className="z-[80] w-[316px] max-w-[calc(100vw-24px)] rounded-xl border border-line bg-paper p-3 shadow-pop data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out"
          >
            <Calendar
              value={value}
              min={min}
              markers={markers}
              autoFocus
              onChange={(d) => {
                onChange(d);
                setOpen(false);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </Field>
  );
}
