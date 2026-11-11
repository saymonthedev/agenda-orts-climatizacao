import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, Instrument_Serif } from 'next/font/google';
import { SITE } from '@/content/site';
import { siteUrl } from '@/lib/site';
import './globals.css';

const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  axes: ['wdth'],
  display: 'swap',
});

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['italic', 'normal'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE.title, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: SITE.keywords,
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: '#111c30',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
