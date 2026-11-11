import Link from 'next/link';
import { LogoHorizontal } from '@/components/brand/logo';
import { buttonClasses } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="on-dark flex min-h-dvh flex-col bg-navy-900 text-porcelain">
      <div className="container-page flex h-20 items-center">
        <Link href="/" aria-label="ORTS Climatização — início">
          <LogoHorizontal variant="negative" className="h-8" />
        </Link>
      </div>
      <div className="container-page flex flex-1 flex-col justify-center pb-24">
        <p className="serif-accent text-6xl text-champagne-400">404</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Página não encontrada.</h1>
        <p className="mt-4 max-w-md text-[17px] leading-relaxed text-porcelain/70">O endereço pode ter mudado ou não existe mais.</p>
        <Link href="/" className={buttonClasses('primary', 'lg', 'mt-8 self-start')}>
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
