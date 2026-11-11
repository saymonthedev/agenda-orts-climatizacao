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
import { Services } from '@/components/site/services';
import { SITE, images, services } from '@/content/site';
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

export default async function HomePage() {
  const profile = await getPublicProfile();
  const url = siteUrl();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HVACBusiness',
    '@id': `${url}/#empresa`,
    name: profile.businessName,
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
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Serviços de climatização',
      itemListElement: services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.title, description: s.summary },
      })),
    },
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
        <Location profile={profile} />
        <Contact profile={profile} />
      </main>
      <Footer profile={profile} />
      <FloatingWhatsApp />
      <RevealController />
    </SiteProvider>
  );
}
