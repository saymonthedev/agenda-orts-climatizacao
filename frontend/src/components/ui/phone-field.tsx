'use client';

import { forwardRef } from 'react';
import { TextField } from './field';

/** Máscara (47) 99999-9999 aplicada enquanto digita. */
export function maskPhone(value: string): string {
  let d = value.replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

type Props = Omit<React.ComponentProps<typeof TextField>, 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;
};

export const PhoneField = forwardRef<HTMLInputElement, Props>(function PhoneField({ value, onChange, ...props }, ref) {
  return (
    <TextField
      ref={ref}
      inputMode="tel"
      placeholder="(47) 99999-9999"
      value={value}
      onChange={(e) => onChange(maskPhone(e.target.value))}
      maxLength={16}
      {...props}
    />
  );
});
