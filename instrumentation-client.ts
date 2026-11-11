import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'

// Browser-side error tracking and analytics. Each one stays off until its
// environment variable is set, so local development sends nothing.
try {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (dsn) {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: 0,
      sendDefaultPii: false,
    })
  }
} catch {
  // ignore
}

try {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (key) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      defaults: '2025-05-24',
      person_profiles: 'identified_only',
      autocapture: false,            // players type names and delivery details — don't capture inputs
      disable_session_recording: true,
    })
  }
} catch {
  // ignore
}
