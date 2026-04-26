import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { CheckoutSchema } from '@/lib/validate'

const TIERS: Record<string, { name: string; price: number; players: number }> = {
  gathering: { name: 'The Gathering', price: 2999, players: 15 },
  party:     { name: 'The Party',     price: 4999, players: 30 },
  bash:      { name: 'The Bash',      price: 7999, players: 50 },
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = CheckoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { tier, game_name } = parsed.data
  const tierConfig = TIERS[tier]

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: tierConfig.price,
          product_data: {
            name: `Pilfer — ${tierConfig.name}`,
            description: `Up to ${tierConfig.players} players`,
          },
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    metadata: { tier, game_name, host_id: user.id },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/dashboard/new&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/new`,
  })

  return NextResponse.json({ url: session.url })
}
