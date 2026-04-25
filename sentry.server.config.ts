// This file configures the initialization of Sentry on the server.
// The config added here will apply whenever the server handles a request.
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
