import { createClient } from '@/lib/supabase-server'
import PricingTiers from './PricingTiers'
import GameSetupForm from './GameSetupForm'

export default async function NewGamePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  if (!session_id) {
    return <PricingTiers />
  }

  const supabase = await createClient()
  const { data: game } = await supabase
    .from('party_games')
    .select('id, game_name, join_code, status')
    .eq('stripe_payment_id', session_id)
    .single()

  if (!game) {
    // Webhook may still be processing — fall back to pricing
    return <PricingTiers />
  }

  return <GameSetupForm game={game} />
}
