import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ORTS Climatização',
    short_name: 'ORTS',
    description: 'Instalação, higienização e manutenção de ar-condicionado em Jaraguá do Sul (SC).',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f1ea',
    theme_color: '#111c30',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
