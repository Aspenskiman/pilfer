'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Join a game</h1>
          <p className="mt-2 text-zinc-400">Enter the code your host shared with you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-4 text-center font-mono text-3xl font-bold tracking-widest text-white uppercase placeholder-zinc-600 focus:border-white focus:outline-none"
            placeholder="XXXXXX"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            Join
          </button>
        </form>
      </div>
    </div>
  )
}
