import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'

const TIERS: Record<string, { name: string; price: number; players: number }> = {
  tier1: { name: 'The Gathering',  price: 2999, players: 15 },
  tier2: { name: 'The Party',      price: 4999, players: 30 },
  tier3: { name: 'The Bash',       price: 7999, players: 50 },
}

export async function POST(request: Request) {
  const { tier, game_name } = await request.json()

  const tierConfig = TIERS[tier]
  if (!tierConfig) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: tierConfig.price,
          product_data: {
            name: `Jamble — ${tierConfig.name}`,
            description: `Up to ${tierConfig.players} players`,
          },
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    metadata: { tier, game_name: game_name ?? '', host_id: user?.id ?? '' },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/dashboard/new&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/new`,
  })

  return NextResponse.json({ url: session.url })
}
