// Next.js instrumentation hook — loaded once per server runtime start.
// Used to bootstrap Sentry on the Node.js and Edge runtimes.
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Catch server-side request errors (Next 15+).
export const onRequestError = Sentry.captureRequestError;
