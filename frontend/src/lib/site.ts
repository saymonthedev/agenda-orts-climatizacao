/** URL pública do site (metadados, sitemap e Open Graph). */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;
  return 'https://orts-jaragua.vercel.app';
}

export const DEVELOPER = {
  name: 'Saymon Oliveira',
  url: 'https://saymonthedev.com',
};
