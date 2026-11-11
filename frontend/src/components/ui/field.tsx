'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const controlClasses = (invalid?: boolean, tone: 'light' | 'paper' = 'paper') =>
  cn(
    'w-full rounded-md border text-[15px] text-ink outline-none transition-[border-color,box-shadow,background-color] duration-150',
    'placeholder:text-subtle/80 disabled:cursor-not-allowed disabled:opacity-60',
    tone === 'paper' ? 'bg-paper' : 'bg-white',
    invalid
      ? 'border-danger/70 shadow-[0_0_0_3px_rgb(176_70_58/0.12)] focus:border-danger focus:shadow-[0_0_0_3px_rgb(176_70_58/0.18)]'
      : 'border-line-strong hover:border-steel-400 focus:border-navy-700 focus:shadow-[0_0_0_3px_rgb(191_159_99/0.28)]',
  );

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
  hideLabel?: boolean;
};

/** Estrutura de campo: rótulo, controle, dica e mensagem de erro acessíveis. */
export function Field({ label, htmlFor, hint, error, optional, className, children, hideLabel }: FieldProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className={cn('flex items-baseline justify-between text-[13px] font-semibold text-ink-soft', hideLabel && 'sr-only')}>
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-subtle">opcional</span>}
      </label>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="flex items-start gap-1.5 text-[13px] leading-snug text-danger">
          <span aria-hidden="true" className="mt-[7px] size-1 shrink-0 rounded-full bg-danger" />
          {error}
        </p>
      ) : hint ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-[13px] leading-snug text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
  containerClassName?: string;
  hideLabel?: boolean;
  tone?: 'light' | 'paper';
};

export const TextField = forwardRef<HTMLInputElement, TextInputProps>(function TextField(
  { label, error, hint, optional, icon, trailing, className, containerClassName, id, hideLabel, tone, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} optional={optional} className={containerClassName} hideLabel={hideLabel}>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle [&_svg]:size-4">{icon}</span>}
        <input
          ref={ref}
          id={inputId}
          autoComplete="off"
          autoCorrect="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(controlClasses(Boolean(error), tone), 'h-11 px-3.5', icon && 'pl-10', trailing && 'pr-11', className)}
          {...props}
        />
        {trailing && <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
    </Field>
  );
});

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  containerClassName?: string;
  tone?: 'light' | 'paper';
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, hint, optional, className, containerClassName, id, tone, rows = 3, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} optional={optional} className={containerClassName}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(controlClasses(Boolean(error), tone), 'min-h-24 resize-y px-3.5 py-3 leading-relaxed', className)}
        {...props}
      />
    </Field>
  );
});
