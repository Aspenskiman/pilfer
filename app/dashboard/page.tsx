import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <span className="text-sm text-zinc-500">{user?.email}</span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <p className="text-zinc-400 mb-6">You haven&apos;t created any games yet.</p>
          <Link
            href="/dashboard/new"
            className="inline-block rounded-lg bg-white px-5 py-2.5 font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            Create your first game
          </Link>
        </div>
      </div>
    </div>
  )
}
