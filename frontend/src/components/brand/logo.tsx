import { cn } from '@/lib/cn';

type LogoProps = {
  variant?: 'positive' | 'negative';
  className?: string;
};

const RATIO = 945 / 120;

/** Logo horizontal (símbolo + nome). Variante negativa para fundos escuros. */
export function LogoHorizontal({ variant = 'positive', className }: LogoProps) {
  const src = variant === 'negative' ? '/brand/logo-horizontal-negativo.svg' : '/brand/logo-horizontal.svg';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="ORTS Climatização Jaraguá" width={Math.round(36 * RATIO)} height={36} className={cn('h-9 w-auto', className)} />
  );
}

/** Troca suave entre as versões clara e escura (cabeçalho sobre o hero). */
export function LogoSwap({ dark, className }: { dark: boolean; className?: string }) {
  return (
    <span className="relative inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-horizontal-negativo.svg"
        alt="ORTS Climatização Jaraguá"
        width={Math.round(36 * RATIO)}
        height={36}
        className={cn('block w-auto transition-opacity duration-300', className, dark ? 'opacity-100' : 'opacity-0')}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-horizontal.svg"
        alt=""
        aria-hidden="true"
        width={Math.round(36 * RATIO)}
        height={36}
        className={cn('absolute left-0 top-0 block w-auto transition-opacity duration-300', className, dark ? 'opacity-0' : 'opacity-100')}
      />
    </span>
  );
}

export function LogoStacked({ variant = 'positive', className }: LogoProps) {
  const src = variant === 'negative' ? '/brand/logo-principal-negativo.svg' : '/brand/logo-principal.svg';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="ORTS Climatização Jaraguá" width={1160} height={752} className={cn('h-auto w-48', className)} />
  );
}

export function Monogram({ variant = 'positive', className }: LogoProps) {
  const src = variant === 'negative' ? '/brand/monograma-negativo.svg' : '/brand/monograma.svg';
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden="true" width={100} height={100} className={cn('size-8', className)} />;
}
