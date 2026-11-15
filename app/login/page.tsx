'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { CenteredCard } from '@/components/brand/Shell'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <CenteredCard>
      <h1 className="pf-display pr-20 text-4xl sm:text-5xl">Welcome back</h1>
      <p className="mt-3 text-ink/70">
        New here?{' '}
        <Link href="/signup" className="pf-link text-ink">
          Create a host account
        </Link>
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
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pf-input"
            placeholder="Your password"
          />
        </div>

        {error && (
          <p className="pf-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="pf-btn pf-btn-lg pf-btn-loot w-full">
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink/60">
        Joining someone else&apos;s game? You don&apos;t need an account.{' '}
        <Link href="/join" className="pf-link text-ink">
          Enter a join code
        </Link>
      </p>
    </CenteredCard>
  )
}
