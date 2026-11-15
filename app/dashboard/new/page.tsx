import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { fulfillCheckoutSession } from '@/lib/games'
import { stripe } from '@/lib/stripe'
import PricingTiers from './PricingTiers'
import GameSetupForm from './GameSetupForm'
import { StatusScreen } from '@/components/brand/Shell'

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
      <StatusScreen
        title="Confirming your payment"
        action={
          <>
            <Link
              href={`/dashboard/new?session_id=${encodeURIComponent(session_id)}`}
              className="pf-btn pf-btn-loot"
            >
              Check again
            </Link>
            <Link href="/dashboard" className="pf-btn pf-btn-ghost">
              Your games
            </Link>
          </>
        }
      >
        <p>
          This usually takes a few seconds. Please don&apos;t pay again. If your game doesn&apos;t
          appear within a few minutes, reply to your Stripe receipt email and we&apos;ll sort it
          out.
        </p>
      </StatusScreen>
    )
  }

  return <GameSetupForm game={game} />
}
