import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { generateJoinCode } from '@/lib/join-code'
import { TIER_MAP, FREE_PLAYER_LIMIT } from '@/constants/tiers'
import { DEFAULT_THEME } from '@/constants/themes'

type NewGame = {
  host_id: string
  game_name: string
  game_date: string | null
  plan: string
  player_limit: number
  stripe_payment_id: string | null
}

type CreateResult = { game_id: string } | { error: string }

// Inserts a game, retrying if the random join code collides.
async function insertGame(game: NewGame): Promise<CreateResult> {
  const admin = createAdminClient()

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await admin
      .from('party_games')
      .insert({
        ...game,
        join_code: generateJoinCode(),
        status: 'setup',
        theme: DEFAULT_THEME,
        game_type: 'pilfer',
      })
      .select('id')
      .single()

    if (data) return { game_id: data.id }

    // 23505 = unique violation: either the join code or the Stripe payment id.
    if (error?.code === '23505') {
      if (game.stripe_payment_id) {
        const { data: existing } = await admin
          .from('party_games')
          .select('id')
          .eq('stripe_payment_id', game.stripe_payment_id)
          .maybeSingle()
        if (existing) return { game_id: existing.id }
      }
      continue
    }

    return { error: error?.message ?? 'Failed to create game' }
  }

  return { error: 'Could not generate a join code. Please try again.' }
}

export async function createFreeGame(hostId: string, gameName: string, gameDate: string) {
  return insertGame({
    host_id: hostId,
    game_name: gameName,
    game_date: gameDate,
    plan: 'free',
    player_limit: FREE_PLAYER_LIMIT,
    stripe_payment_id: null,
  })
}

// Turns a paid Stripe Checkout session into a game. Idempotent: safe to call
// from both the webhook and the post-payment redirect, in either order.
export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<CreateResult> {
  if (session.payment_status !== 'paid') return { error: 'Payment not completed' }

  const hostId = session.metadata?.host_id
  const tier = TIER_MAP[session.metadata?.tier ?? '']
  if (!hostId || !tier || tier.priceInCents == null) {
    return { error: 'Checkout session is missing game details' }
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('party_games')
    .select('id')
    .eq('stripe_payment_id', session.id)
    .maybeSingle()
  if (existing) return { game_id: existing.id }

  return insertGame({
    host_id: hostId,
    game_name: session.metadata?.game_name || 'My Pilfer Game',
    game_date: session.metadata?.game_date || null,
    plan: tier.id,
    player_limit: tier.playerLimit,
    stripe_payment_id: session.id,
  })
}

// Returns the signed-in user and the game, only if that user is its host.
export async function requireHostGame(gameId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  const admin = createAdminClient()
  const { data: game } = await admin
    .from('party_games')
    .select('id, host_id, status, recap_unlocked')
    .eq('id', gameId)
    .maybeSingle()

  if (!game || game.host_id !== user.id) {
    return { error: 'Game not found or not authorized', status: 403 as const }
  }
  return { user, game, admin }
}
