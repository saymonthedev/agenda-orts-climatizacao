import { Slot } from 'radix-ui';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';

const variants = {
  primary:
    'bg-champagne-400 text-navy-950 hover:bg-champagne-300 active:bg-champagne-500 shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)]',
  dark: 'bg-navy-900 text-porcelain hover:bg-navy-800 active:bg-navy-950',
  secondary: 'border border-line-strong bg-paper text-ink hover:border-ink-soft hover:bg-white active:bg-porcelain',
  ghost: 'text-ink-soft hover:bg-ink/[0.06] active:bg-ink/10',
  'outline-light': 'border border-white/25 text-porcelain hover:border-white/60 hover:bg-white/[0.06] active:bg-white/10',
  'ghost-light': 'text-porcelain/85 hover:text-porcelain hover:bg-white/[0.07]',
  danger: 'bg-danger text-white hover:bg-[#9a3a30] active:bg-[#86322a]',
  'danger-ghost': 'text-danger hover:bg-danger-bg',
} as const;

const sizes = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-[15px] gap-2.5',
  icon: 'size-11 justify-center',
  'icon-sm': 'size-9 justify-center',
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  asChild?: boolean;
};

export const buttonClasses = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) =>
  cn(
    'relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md font-semibold tracking-[-0.005em]',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out',
    'disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
    variants[variant],
    sizes[size],
    className,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, asChild = false, className, children, disabled, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? 'button')}
      className={buttonClasses(variant, size, className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner />
            </span>
          )}
          <span className={cn('inline-flex items-center gap-[inherit]', loading && 'invisible')}>{children}</span>
        </>
      )}
    </Comp>
  );
});
