import type { PublicProfileDTO } from '@orts/backend/contracts';
import { ArrowUpRight, Mail, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatPhone } from '@/lib/format';
import { telLink, whatsappLink } from '@/lib/links';
import { InstagramIcon, WhatsAppIcon } from './icons';
import { LazyRequestForm } from './lazy-request-form';

function Channel({ href, icon, label, value, external, primary }: { href: string; icon: ReactNode; label: string; value: string; external?: boolean; primary?: boolean }) {
  return (
    <li>
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={
          primary
            ? 'group flex items-center gap-4 rounded-lg bg-navy-900 p-5 text-porcelain transition-colors hover:bg-navy-800'
            : 'group flex items-center gap-4 border-b border-champagne-300 py-4 text-ink transition-colors hover:border-ink'
        }
      >
        <span
          className={
            primary
              ? 'inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-champagne-400 text-navy-950 [&_svg]:size-5'
              : 'inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-champagne-400 text-champagne-700 [&_svg]:size-[18px]'
          }
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className={primary ? 'eyebrow block text-[10px] text-champagne-400' : 'eyebrow block text-[10px] text-champagne-700'}>{label}</span>
          <span className="mt-0.5 block truncate text-[17px] font-semibold">{value}</span>
        </span>
        <ArrowUpRight className="size-5 shrink-0 opacity-50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
      </a>
    </li>
  );
}

export function Contact({ profile }: { profile: PublicProfileDTO }) {
  const hasChannels = Boolean(profile.whatsapp || profile.phone || profile.email || profile.instagramUrl);
  return (
    <section id="contato" className="scroll-mt-16 bg-champagne-100 py-20 sm:py-24 lg:scroll-mt-20 lg:py-32">
      <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:sticky lg:top-32 lg:col-span-5 lg:self-start" data-reveal>
          <p className="eyebrow flex items-center gap-3 text-champagne-700">
            <span aria-hidden="true" className="h-px w-8 bg-champagne-600/60" />
            Contato
          </p>
          <h2 className="display mt-6 text-[2.2rem] leading-[1.05] sm:text-5xl">
            Vamos deixar o seu ambiente <span className="serif-accent text-champagne-700">no clima certo?</span>
          </h2>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ink-soft">
            Conte o que você precisa e o bairro do atendimento. A ORTS responde pelo WhatsApp para combinar data e horário.
          </p>

          {hasChannels && (
            <ul className="mt-10 flex flex-col gap-1">
              {profile.whatsapp && (
                <Channel primary href={whatsappLink(profile.whatsapp)} external icon={<WhatsAppIcon />} label="WhatsApp" value={formatPhone(profile.whatsapp)} />
              )}
              {profile.phone && <Channel href={telLink(profile.phone)} icon={<Phone aria-hidden="true" />} label="Telefone" value={formatPhone(profile.phone)} />}
              {profile.email && <Channel href={`mailto:${profile.email}`} icon={<Mail aria-hidden="true" />} label="E-mail" value={profile.email} />}
              {profile.instagramUrl && (
                <Channel
                  href={profile.instagramUrl}
                  external
                  icon={<InstagramIcon />}
                  label="Instagram"
                  value={`@${profile.instagramUrl.replace(/\/+$/, '').split('/').pop()}`}
                />
              )}
            </ul>
          )}
        </div>

        <div className="lg:col-span-6 lg:col-start-7" data-reveal>
          <div className="border border-champagne-300 bg-paper p-5 shadow-[0_30px_60px_-40px_rgb(15_24_40/0.35)] sm:p-8 lg:p-10">
            <h3 className="text-xl font-semibold tracking-[-0.01em]">Solicite seu atendimento</h3>
            <p className="mt-1.5 text-[15px] text-muted">Leva menos de um minuto.</p>
            <div className="mt-7">
              <LazyRequestForm profile={profile} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
