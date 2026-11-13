import { createApp, type CreateAppOptions } from './app';

export { createApp, type App, type CreateAppOptions } from './app';
export { getPublicProfile, EMPTY_PUBLIC_PROFILE } from './modules/settings/public-profile';
export { getPublicReviews } from './modules/reviews/public-reviews';

/** Handler fetch-compatível para montar a API em qualquer runtime (ex.: Route Handler do Next.js). */
export function createRequestHandler(options?: CreateAppOptions) {
  const app = createApp(options);
  return (request: Request) => app.fetch(request);
}
