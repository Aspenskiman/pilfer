import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { fulfillCheckoutSession } from '@/lib/games'
import { stripe } from '@/lib/stripe'
import PricingTiers from './PricingTiers'
import GameSetupForm from './GameSetupForm'

export default async function NewGamePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  if (!session_id) return <PricingTiers />

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Don't wait for the webhook: confirm the payment with Stripe directly and
  // create the game here if it doesn't exist yet. Fulfilment is idempotent,
  // so whichever of this page and the webhook runs first wins.
  let gameId: string | null = null
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id)
    if (session.metadata?.host_id === user.id) {
      const result = await fulfillCheckoutSession(session)
      if ('game_id' in result) gameId = result.game_id
      else console.error('[dashboard/new] fulfilment failed', session_id, result.error)
    }
  } catch (err) {
    console.error('[dashboard/new] could not verify checkout session', err)
  }

  const admin = createAdminClient()
  const { data: game } = gameId
    ? await admin
        .from('party_games')
        .select('id, game_name, join_code, status, game_date, theme, video_url')
        .eq('id', gameId)
        .eq('host_id', user.id)
        .maybeSingle()
    : { data: null }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">We&apos;re confirming your payment</h1>
          <p className="text-zinc-400">
            This usually takes a few seconds. Please don&apos;t pay again — refresh this page, or
            check your dashboard. If your game doesn&apos;t appear within a few minutes, reply to
            your Stripe receipt email and we&apos;ll sort it out.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href={`/dashboard/new?session_id=${encodeURIComponent(session_id)}`}
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
            >
              Refresh
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              My games
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <GameSetupForm game={game} />
}
