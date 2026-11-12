'use client';

import { forwardRef, type ReactNode } from 'react';
import { digitsToCents, formatMoneyInput } from '@/lib/money';
import { TextField } from './field';

type MoneyFieldProps = {
  label: string;
  value: number | null;
  onChange: (cents: number | null) => void;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  placeholder?: string;
  containerClassName?: string;
  autoFocus?: boolean;
};

/** Campo de valor em reais: os dígitos entram pela direita (123 → R$ 1,23), com teclado numérico. */
export const MoneyField = forwardRef<HTMLInputElement, MoneyFieldProps>(function MoneyField(
  { label, value, onChange, error, hint, optional, placeholder = '0,00', containerClassName, autoFocus },
  ref,
) {
  return (
    <TextField
      ref={ref}
      label={label}
      icon={<span className="text-[15px] font-medium">R$</span>}
      inputMode="numeric"
      enterKeyHint="done"
      placeholder={placeholder}
      value={formatMoneyInput(value)}
      onChange={(e) => onChange(digitsToCents(e.target.value))}
      error={error}
      hint={hint}
      optional={optional}
      containerClassName={containerClassName}
      className="tabular text-right"
      autoFocus={autoFocus}
    />
  );
});
