'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    try {
      Sentry.captureException(error)
    } catch {
      // ignore
    }
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#1A2B4A', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <h1 style={{ fontSize: 28, marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ opacity: 0.7, marginBottom: 24 }}>
              Your game is safe. Reload this page to jump back in.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#B8922A', color: 'white', border: 0, borderRadius: 12, padding: '14px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
