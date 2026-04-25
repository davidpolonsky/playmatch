// This file configures the initialization of Sentry for edge features (middleware,
// edge routes, etc.). The config added here will apply whenever one of the edge
// features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime — it applies to
// anything running on Next.js's edge runtime.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    tracesSampleRate: 0.1,

    debug: false,

    environment: process.env.SENTRY_ENV || process.env.NODE_ENV,
  });
}
