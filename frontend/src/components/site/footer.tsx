import type { PublicProfileDTO } from '@orts/backend/contracts';
import { ArrowUpRight } from 'lucide-react';
import { LogoStacked } from '@/components/brand/logo';
import { navigation, services } from '@/content/site';
import { formatPhone } from '@/lib/format';
import { DEVELOPER } from '@/lib/site';
import { telLink, whatsappLink } from '@/lib/links';
import { InstagramIcon } from './icons';

export function Footer({ profile }: { profile: PublicProfileDTO }) {
  const year = new Date().getFullYear();
  return (
    <footer className="on-dark bg-navy-950 text-porcelain">
      <div className="container-page grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-20">
        <div className="sm:col-span-2 lg:col-span-4">
          <LogoStacked variant="negative" className="w-44" />
          <p className="mt-6 max-w-xs text-[15px] leading-relaxed text-porcelain/60">
            Instalação, higienização e manutenção de ar-condicionado em Jaraguá do Sul (SC).
          </p>
          {profile.instagramUrl && (
            <a
              href={profile.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex size-11 items-center justify-center rounded-full border border-white/15 transition-colors hover:border-champagne-400 hover:text-champagne-400"
              aria-label="Instagram da ORTS Climatização"
            >
              <InstagramIcon className="size-5" />
            </a>
          )}
        </div>

        <nav aria-label="Rodapé" className="lg:col-span-2 lg:col-start-6">
          <p className="eyebrow text-[11px] text-champagne-400">Navegação</p>
          <ul className="mt-5 space-y-3 text-[15px]">
            {navigation.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-porcelain/70 transition-colors hover:text-porcelain">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <p className="eyebrow text-[11px] text-champagne-400">Serviços</p>
          <ul className="mt-5 space-y-3 text-[15px]">
            {services.map((s) => (
              <li key={s.id}>
                <a href="#servicos" className="text-porcelain/70 transition-colors hover:text-porcelain">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <p className="eyebrow text-[11px] text-champagne-400">Atendimento</p>
          <ul className="mt-5 space-y-3 text-[15px] text-porcelain/70">
            <li>{profile.address ?? 'Jaraguá do Sul - SC'}</li>
            {profile.whatsapp && (
              <li>
                <a href={whatsappLink(profile.whatsapp)} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-porcelain">
                  WhatsApp {formatPhone(profile.whatsapp)}
                </a>
              </li>
            )}
            {profile.phone && (
              <li>
                <a href={telLink(profile.phone)} className="transition-colors hover:text-porcelain">
                  {formatPhone(profile.phone)}
                </a>
              </li>
            )}
            {profile.email && (
              <li>
                <a href={`mailto:${profile.email}`} className="break-all transition-colors hover:text-porcelain">
                  {profile.email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[13px] text-porcelain/65 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {profile.businessName}. Todos os direitos reservados.
          </p>
          <a
            href={DEVELOPER.url}
            target="_blank"
            rel="noopener"
            className="group inline-flex items-center gap-1.5 self-start transition-colors hover:text-porcelain/80 sm:self-auto"
          >
            Desenvolvido por <span className="font-medium text-porcelain/80 group-hover:text-porcelain">{DEVELOPER.name}</span>
            <ArrowUpRight className="size-3.5 opacity-70" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
