import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { fulfillCheckoutSession } from '@/lib/games'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const result = await fulfillCheckoutSession(session)

    if ('error' in result) {
      // Non-2xx makes Stripe retry — a paid customer must always end up with a game.
      console.error('[stripe/webhook] fulfilment failed', session.id, result.error)
      return NextResponse.json({ error: 'Fulfilment failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
