'use client';

import { Check, ChevronDown } from 'lucide-react';
import { Select as S } from 'radix-ui';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { controlClasses, Field } from './field';

export type SelectOption<V extends string = string> = {
  value: V;
  label: string;
  description?: string;
  leading?: ReactNode;
  disabled?: boolean;
};

type SelectProps<V extends string> = {
  label: string;
  value: V | '';
  onChange: (value: V) => void;
  options: SelectOption<V>[];
  placeholder?: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  disabled?: boolean;
  className?: string;
  hideLabel?: boolean;
  tone?: 'light' | 'paper';
  id?: string;
  size?: 'md' | 'sm';
};

/** Select personalizado (comportamento acessível do Radix, visual próprio). */
export function Select<V extends string>({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecione',
  error,
  hint,
  optional,
  disabled,
  className,
  hideLabel,
  tone,
  id,
  size = 'md',
}: SelectProps<V>) {
  const autoId = useId();
  const triggerId = id ?? autoId;
  const selected = options.find((o) => o.value === value);
  return (
    <Field label={label} htmlFor={triggerId} error={error} hint={hint} optional={optional} className={className} hideLabel={hideLabel}>
      <S.Root value={value || undefined} onValueChange={(v) => onChange(v as V)} disabled={disabled}>
        <S.Trigger
          id={triggerId}
          aria-invalid={error ? true : undefined}
          className={cn(
            controlClasses(Boolean(error), tone),
            'group flex items-center justify-between gap-2 px-3.5 text-left',
            size === 'md' ? 'h-11' : 'h-9 text-sm',
            'data-[placeholder]:text-subtle',
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5 truncate">
            {selected?.leading}
            <S.Value placeholder={placeholder}>{selected?.label}</S.Value>
          </span>
          <S.Icon asChild>
            <ChevronDown className="size-4 shrink-0 text-subtle transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
          </S.Icon>
        </S.Trigger>
        <S.Portal>
          <S.Content
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            className={cn(
              'z-[80] max-h-[min(360px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line bg-paper shadow-pop',
              'data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out',
            )}
          >
            <S.Viewport className="scrollbar-thin p-1.5">
              {options.map((option) => (
                <S.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    'relative flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-md py-2 pl-3 pr-9 text-[14px] text-ink outline-none',
                    'data-[highlighted]:bg-steel-100 data-[state=checked]:font-semibold data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45',
                  )}
                >
                  {option.leading}
                  <span className="flex min-w-0 flex-col">
                    <S.ItemText>{option.label}</S.ItemText>
                    {option.description && <span className="text-xs font-normal text-muted">{option.description}</span>}
                  </span>
                  <S.ItemIndicator className="absolute right-3 inline-flex">
                    <Check className="size-4 text-steel-600" aria-hidden="true" />
                  </S.ItemIndicator>
                </S.Item>
              ))}
            </S.Viewport>
          </S.Content>
        </S.Portal>
      </S.Root>
    </Field>
  );
}
