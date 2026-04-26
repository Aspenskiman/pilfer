import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const array = new Uint8Array(6)
    crypto.getRandomValues(array)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // removed ambiguous chars
    const join_code = Array.from(array).map(b => chars[b % chars.length]).join('')

    const row = {
      status: 'setup',
      host_id: session.metadata?.host_id ?? null,
      game_name: session.metadata?.game_name ?? null,
      join_code,
      stripe_payment_id: session.id,
    }

    console.log('[webhook] inserting into party_games:', row)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase.from('party_games').insert(row).select()

    console.log('[webhook] insert result:', { data, error })
  }

  return NextResponse.json({ received: true })
}
