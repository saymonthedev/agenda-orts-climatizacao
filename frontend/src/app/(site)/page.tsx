import { getPublicProfile } from '@orts/backend';
import type { Metadata } from 'next';
import { About } from '@/components/site/about';
import { Contact } from '@/components/site/contact';
import { FloatingWhatsApp } from '@/components/site/floating-whatsapp';
import { Footer } from '@/components/site/footer';
import { Gallery } from '@/components/site/gallery';
import { Header } from '@/components/site/header';
import { Hero } from '@/components/site/hero';
import { Location } from '@/components/site/location';
import { Process } from '@/components/site/process';
import { SiteProvider } from '@/components/site/request-context';
import { RevealController } from '@/components/site/reveal';
import { Reviews } from '@/components/site/reviews';
import { Services } from '@/components/site/services';
import { SITE, images, services } from '@/content/site';
import { getGoogleReviews } from '@/lib/google-reviews';
import { siteUrl } from '@/lib/site';

// Página estática, regenerada periodicamente e sempre que os dados comerciais mudam no painel.
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
  },
  twitter: { card: 'summary_large_image', title: SITE.title, description: SITE.description },
  robots: { index: true, follow: true },
};

const SCHEMA_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Horário de atendimento no formato do schema.org, agrupando os dias com o mesmo horário. */
function openingHours(hours: { weekday: number; start: string; end: string }[]) {
  const groups = new Map<string, number[]>();
  for (const h of hours) groups.set(`${h.start}-${h.end}`, [...(groups.get(`${h.start}-${h.end}`) ?? []), h.weekday]);
  return [...groups.entries()].map(([range, days]) => {
    const [opens, closes] = range.split('-');
    return { '@type': 'OpeningHoursSpecification', dayOfWeek: days.map((d) => `https://schema.org/${SCHEMA_DAYS[d]}`), opens, closes };
  });
}

export default async function HomePage() {
  const [profile, reviews] = await Promise.all([getPublicProfile(), getGoogleReviews()]);
  const url = siteUrl();

  const business = {
    '@type': 'HVACBusiness',
    '@id': `${url}/#empresa`,
    name: profile.businessName,
    alternateName: SITE.alternateNames,
    description: SITE.description,
    url,
    logo: `${url}/brand/logo-principal.svg`,
    image: [`${url}${images.condensadora.src}`, `${url}${images.splitInterno.src}`],
    areaServed: { '@type': 'City', name: 'Jaraguá do Sul', containedInPlace: { '@type': 'State', name: 'Santa Catarina' } },
    address: {
      '@type': 'PostalAddress',
      ...(profile.address ? { streetAddress: profile.address.split(',')[0]?.trim() } : {}),
      addressLocality: 'Jaraguá do Sul',
      addressRegion: 'SC',
      addressCountry: 'BR',
    },
    ...(profile.phone || profile.whatsapp ? { telephone: `+55${profile.phone ?? profile.whatsapp}` } : {}),
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.instagramUrl ? { sameAs: [profile.instagramUrl] } : {}),
    ...(profile.hours?.length ? { openingHoursSpecification: openingHours(profile.hours) } : {}),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Serviços de climatização',
      itemListElement: services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.title, description: s.summary },
      })),
    },
  };

  // O bloco WebSite define o nome do site que o Google mostra nos resultados.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${url}/#site`,
        url,
        name: SITE.name,
        alternateName: SITE.alternateNames,
        inLanguage: 'pt-BR',
        publisher: { '@id': `${url}/#empresa` },
      },
      business,
    ],
  };

  return (
    <SiteProvider profile={profile}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-champagne-400 focus:px-4 focus:py-3 focus:font-semibold focus:text-navy-950"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <Hero />
        <About />
        <Services />
        <Process />
        <Gallery />
        <Reviews data={reviews} />
        <Location profile={profile} />
        <Contact profile={profile} />
      </main>
      <Footer profile={profile} />
      <FloatingWhatsApp />
      <RevealController />
    </SiteProvider>
  );
}
