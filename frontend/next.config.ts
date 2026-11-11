import path from 'node:path';
import type { NextConfig } from 'next';

const workspaceRoot = path.resolve(process.cwd(), '..');
const isProd = process.env.NODE_ENV === 'production';

/** Política de segurança de conteúdo (sem dependências externas além do Google Maps). */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (isProd ? '' : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  'frame-src https://www.google.com https://maps.google.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // não gera AGENTS.md automaticamente no repositório
  agentRules: false,
  poweredByHeader: false,
  // O backend é um pacote TypeScript do workspace, compilado junto com o Next.
  transpilePackages: ['@orts/backend'],
  // PGlite (banco local de desenvolvimento) não deve ser empacotado.
  serverExternalPackages: ['@electric-sql/pglite'],
  outputFileTracingRoot: workspaceRoot,
  outputFileTracingExcludes: {
    '*': ['node_modules/@electric-sql/pglite/**', '../node_modules/@electric-sql/pglite/**'],
  },
  turbopack: {
    root: workspaceRoot,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [60, 75, 85],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default nextConfig;
