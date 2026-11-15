'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CenteredCard } from '@/components/brand/Shell'

export default function JoinPage() {
  const router = useRouter()
  const [code, setCode] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim()) {
      router.push(`/join/${code.trim().toUpperCase()}`)
    }
  }

  return (
    <CenteredCard width="max-w-sm">
      <h1 className="pf-display pr-20 text-4xl sm:text-5xl">Join a game</h1>
      <p className="mt-3 text-ink/70">Enter the six-character code your host shared.</p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="join_code" className="pf-label">
            Join code
          </label>
          <input
            id="join_code"
            type="text"
            required
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="pf-input pf-display !py-4 text-center !text-4xl uppercase tracking-[0.2em]"
            placeholder="ABC123"
          />
        </div>
        <button type="submit" className="pf-btn pf-btn-lg pf-btn-loot w-full">
          Join
        </button>
      </form>
    </CenteredCard>
  )
}
