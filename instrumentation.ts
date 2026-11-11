import type { Instrumentation } from 'next'

// Server-side error tracking. Does nothing until SENTRY_DSN is set.
export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  const Sentry = await import('@sentry/nextjs')
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  })
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return
  try {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureRequestError(err, request, context)
    await Sentry.flush(2000)
  } catch {
    // never let error reporting break a request
  }
}
