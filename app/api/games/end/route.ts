import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHostGame } from '@/lib/games'

const EndGameSchema = z.object({ game_id: z.string().uuid() })

export async function POST(request: Request) {
  const parsed = EndGameSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const ctx = await requireHostGame(parsed.data.game_id)
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  if (ctx.game.status !== 'complete') {
    return NextResponse.json({ error: 'The game is not finished yet.' }, { status: 409 })
  }

  const { error } = await ctx.admin
    .from('party_games')
    .update({ recap_unlocked: true })
    .eq('id', ctx.game.id)

  if (error) {
    console.error('[games/end]', error.message)
    return NextResponse.json({ error: 'Could not end the game. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
