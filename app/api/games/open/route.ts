import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHostGame } from '@/lib/games'

const OpenGameSchema = z.object({ game_id: z.string().uuid() })

export async function POST(request: Request) {
  const parsed = OpenGameSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const ctx = await requireHostGame(parsed.data.game_id)
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  // Only a game still in setup can be opened — never move a live game backwards.
  if (ctx.game.status !== 'setup') {
    return NextResponse.json({ success: true })
  }

  const { error } = await ctx.admin
    .from('party_games')
    .update({ status: 'invited' })
    .eq('id', ctx.game.id)
    .eq('status', 'setup')

  if (error) {
    console.error('[games/open]', error.message)
    return NextResponse.json({ error: 'Could not open the game. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
