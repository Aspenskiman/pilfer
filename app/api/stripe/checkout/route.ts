import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'
import { CheckoutSchema } from '@/lib/validate'
import { TIER_MAP } from '@/constants/tiers'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = CheckoutSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the game name and date.' }, { status: 400 })
  }

  const { tier: tierId, game_name, game_date } = parsed.data
  const tier = TIER_MAP[tierId]
  if (!tier || tier.priceInCents == null) {
    return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: tier.priceInCents,
            product_data: {
              name: `Pilfer — ${tier.label}`,
              description: `One game, ${tier.players.toLowerCase()}`,
            },
          },
        },
      ],
      metadata: { tier: tier.id, game_name, game_date, host_id: user.id },
      success_url: `${siteUrl}/dashboard/new?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard/new`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json(
      { error: 'Could not start checkout. Please try again.' },
      { status: 502 }
    )
  }
}
