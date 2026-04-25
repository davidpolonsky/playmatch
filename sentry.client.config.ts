// This file configures the initialization of Sentry on the client (browser).
// The config added here will apply whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    // Lower sample rates reduce cost. Adjust once you see volume.
    tracesSampleRate: 0.1,

    // Capture Replay for 10% of all sessions, plus 100% of sessions with an error.
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,

    // Keep this false in dev to avoid noise.
    debug: false,

    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV,

    // Ignore noisy extension / third-party errors that aren't our bugs
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
    ],
  });
}
