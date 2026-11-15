'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { CenteredCard, StatusScreen } from '@/components/brand/Shell'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setConfirmed(true)
    }
  }

  if (confirmed) {
    return (
      <StatusScreen title="Check your email">
        <p>
          We sent a confirmation link to <span className="font-bold text-tusk">{email}</span>. Open
          it to finish setting up your account.
        </p>
      </StatusScreen>
    )
  }

  return (
    <CenteredCard>
      <h1 className="pf-display pr-20 text-4xl sm:text-5xl">Host a game</h1>
      <p className="mt-3 text-ink/70">
        Create a host account to run your gift swap. Games with up to 5 players are free.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="email" className="pf-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pf-input"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="pf-label">
            Password <span className="pf-hint">(6 characters or more)</span>
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pf-input"
            placeholder="Choose a password"
          />
        </div>

        {error && (
          <p className="pf-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="pf-btn pf-btn-lg pf-btn-loot w-full">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink/60">
        Already have an account?{' '}
        <Link href="/login" className="pf-link text-ink">
          Log in
        </Link>
      </p>
    </CenteredCard>
  )
}
