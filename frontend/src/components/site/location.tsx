import type { PublicProfileDTO } from '@orts/backend/contracts';
import { ArrowUpRight, Clock, MapPin, Navigation, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPhone } from '@/lib/format';
import { groupHours } from '@/lib/hours';
import { mapsDirectionsLink, mapsEmbedUrl, mapsSearchLink, telLink, whatsappLink } from '@/lib/links';
import { WhatsAppIcon } from './icons';

export function Location({ profile }: { profile: PublicProfileDTO }) {
  const place = profile.address ?? 'Jaraguá do Sul - SC';
  const hours = profile.hours?.length ? groupHours(profile.hours) : null;

  return (
    <section id="atendimento" className="on-dark relative isolate scroll-mt-16 overflow-hidden bg-navy-900 py-20 text-porcelain sm:py-24 lg:scroll-mt-20 lg:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_0%_0%,rgb(212_193_156/0.12),transparent_70%)]" />
      <div className="container-page grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div className="lg:col-span-5" data-reveal>
          <p className="eyebrow flex items-center gap-3 text-champagne-400">
            <span aria-hidden="true" className="h-px w-8 bg-champagne-400/70" />
            Atendimento
          </p>
          <h2 className="display mt-6 text-[2.2rem] leading-[1.05] sm:text-5xl">
            Atendimento no local, <span className="serif-accent text-champagne-400">com hora marcada.</span>
          </h2>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-porcelain/70">
            {profile.serviceArea ?? 'A equipe vai até você em Jaraguá do Sul para instalar, higienizar ou revisar o seu equipamento.'}
          </p>

          <dl className="mt-10 divide-y divide-white/10 border-y border-white/10">
            <div className="flex gap-4 py-5">
              <dt className="mt-0.5 text-champagne-400">
                <MapPin className="size-5" aria-hidden="true" />
                <span className="sr-only">Localização</span>
              </dt>
              <dd>
                <span className="block text-[15px] font-semibold">{place}</span>
                <span className="mt-0.5 block text-sm text-porcelain/60">Base da ORTS Climatização</span>
              </dd>
            </div>
            {hours && (
              <div className="flex gap-4 py-5">
                <dt className="mt-0.5 text-champagne-400">
                  <Clock className="size-5" aria-hidden="true" />
                  <span className="sr-only">Horário de atendimento</span>
                </dt>
                <dd className="space-y-1">
                  {hours.map((h) => (
                    <span key={h.days} className="flex flex-wrap gap-x-2 text-[15px]">
                      <span className="font-semibold">{h.days}</span>
                      <span className="tabular text-porcelain/70">{h.time}</span>
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {(profile.whatsapp || profile.phone) && (
              <div className="flex gap-4 py-5">
                <dt className="mt-0.5 text-champagne-400">
                  <Phone className="size-5" aria-hidden="true" />
                  <span className="sr-only">Contato</span>
                </dt>
                <dd className="flex flex-col gap-1 text-[15px]">
                  {profile.whatsapp && (
                    <a href={whatsappLink(profile.whatsapp)} target="_blank" rel="noopener noreferrer" className="font-semibold underline-offset-4 hover:underline">
                      WhatsApp {formatPhone(profile.whatsapp)}
                    </a>
                  )}
                  {profile.phone && (
                    <a href={telLink(profile.phone)} className="text-porcelain/80 underline-offset-4 hover:underline">
                      Telefone {formatPhone(profile.phone)}
                    </a>
                  )}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="primary">
              <a href={mapsDirectionsLink(place)} target="_blank" rel="noopener noreferrer">
                <Navigation className="size-4" aria-hidden="true" /> Abrir rota
              </a>
            </Button>
            {profile.whatsapp ? (
              <Button asChild variant="outline-light">
                <a href={whatsappLink(profile.whatsapp)} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="size-4" /> Falar no WhatsApp
                </a>
              </Button>
            ) : (
              <Button asChild variant="outline-light">
                <a href={mapsSearchLink(place)} target="_blank" rel="noopener noreferrer">
                  Ver no Google Maps <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="lg:col-span-7" data-reveal>
          <div className="relative aspect-[4/3] overflow-hidden bg-navy-800 [clip-path:polygon(0_0,88%_0,100%_12%,100%_100%,0_100%)] sm:aspect-[16/11]">
            <iframe
              title={`Mapa: ${place}`}
              src={mapsEmbedUrl(place)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 size-full border-0 [filter:grayscale(0.55)_contrast(1.05)_saturate(0.9)]"
            />
          </div>
          <p className="mt-3 flex items-center gap-3 text-[13px] text-porcelain/55">
            <span aria-hidden="true" className="h-px w-6 bg-white/25" />
            {place}
          </p>
        </div>
      </div>
    </section>
  );
}
