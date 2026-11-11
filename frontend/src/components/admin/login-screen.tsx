'use client';

import Image from 'next/image';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { loginSchema } from '@orts/backend/contracts';
import { LogoHorizontal } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { images } from '@/content/site';
import { api, ApiError } from '@/lib/api';
import { DEVELOPER } from '@/lib/site';

/** Aceita apenas destinos internos do painel (evita redirecionamento aberto). */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/admin') || next.startsWith('//') || next.includes('\\')) return '/admin';
  return next;
}

export function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as 'username' | 'password';
        next[key] ??= issue.message;
      }
      setErrors(next);
      (next.username ? userRef : passRef).current?.focus();
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api.post('/auth/login', parsed.data);
      router.replace(safeNext(params.get('next')));
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.';
      setErrors({ form: message });
      setLoading(false);
      passRef.current?.select();
    }
  }

  return (
    <main className="grid min-h-dvh bg-porcelain lg:grid-cols-[1.05fr_1fr]">
      <section className="on-dark relative isolate hidden overflow-hidden bg-navy-900 text-porcelain lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <Image src={images.condensadora.src} alt="" fill sizes="50vw" priority className="-z-20 object-cover object-[60%_40%] opacity-35" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-br from-navy-950 via-navy-900/85 to-navy-900/40" />
        <LogoHorizontal variant="negative" className="h-10" />
        <div className="max-w-md">
          <p className="eyebrow text-champagne-400">Área restrita</p>
          <p className="display mt-5 text-5xl leading-[1.04]">
            Sua agenda, <span className="serif-accent text-champagne-400">sempre em ordem.</span>
          </p>
          <p className="mt-5 text-[17px] leading-relaxed text-porcelain/70">
            Atendimentos, horários e clientes da ORTS Climatização em um só lugar, no computador ou no celular.
          </p>
        </div>
        <p className="text-[13px] text-porcelain/70">
          Desenvolvido por{' '}
          <a href={DEVELOPER.url} target="_blank" rel="noopener" className="text-porcelain/65 hover:text-porcelain">
            {DEVELOPER.name}
          </a>
        </p>
      </section>

      <section className="flex flex-col">
        <div className="on-dark bg-navy-900 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] text-porcelain sm:px-8 lg:hidden">
          <LogoHorizontal variant="negative" className="h-8" />
          <p className="display mt-8 text-[2rem] leading-[1.08]">
            Sua agenda, <span className="serif-accent text-champagne-400">sempre em ordem.</span>
          </p>
        </div>
        <div className="flex flex-1 items-start justify-center px-4 py-10 sm:px-8 lg:items-center lg:py-16">
          <div className="w-full max-w-[400px]">
            <h1 className="text-2xl font-semibold tracking-[-0.015em] text-ink">Entrar no painel</h1>
            <p className="mt-1.5 text-[15px] text-muted">Acesso exclusivo da ORTS Climatização.</p>

            <form onSubmit={onSubmit} noValidate autoComplete="off" className="mt-8 flex flex-col gap-5">
              {errors.form && (
                <div role="alert" className="rounded-md border border-danger/25 bg-danger-bg px-4 py-3 text-[14px] leading-snug text-[#7f2f25]">
                  {errors.form}
                </div>
              )}
              <TextField
                ref={userRef}
                label="Usuário"
                icon={<UserRound />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={errors.username}
                autoCapitalize="none"
                spellCheck={false}
                maxLength={40}
              />
              <TextField
                ref={passRef}
                label="Senha"
                type={show ? 'text' : 'password'}
                icon={<LockKeyhole />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                maxLength={200}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="inline-flex size-9 items-center justify-center rounded-md text-subtle hover:bg-ink/[0.06] hover:text-ink"
                    aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={show}
                  >
                    {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                }
              />
              <Button type="submit" variant="dark" size="lg" loading={loading} className="mt-1 w-full">
                Entrar
              </Button>
            </form>
            <p className="mt-8 text-[13px] leading-relaxed text-muted">
              Esqueceu a senha? Peça a redefinição ao responsável técnico do sistema.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
