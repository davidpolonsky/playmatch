/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  serverExternalPackages: ['firebase-admin'],
  async redirects() {
    return [
      // Friendlier URL alias — /soccer mirrors /basketball naming
      { source: '/soccer', destination: '/teams', permanent: false },
      // Facebook launch link — clean URL for posts, UTMs ride along for tracking
      { source: '/fb', destination: '/?utm_source=facebook&utm_medium=organic&utm_campaign=launch_pinned', permanent: false },
    ];
  },
};

// Wrap with Sentry — only applies extra build steps (source map upload, etc.)
// when SENTRY_AUTH_TOKEN is set, so local dev without Sentry keeps working.
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
  // Sentry webpack plugin options — see https://github.com/getsentry/sentry-webpack-plugin
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress noisy logs in CI output.
  silent: !process.env.CI,

  // Upload source maps only when auth token is present.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Hides source maps from the public output.
  hideSourceMaps: true,

  // Disable logger statements in production bundle for smaller size.
  disableLogger: true,

  // Automatically instrument Vercel Cron jobs if present.
  automaticVercelMonitors: true,
});
