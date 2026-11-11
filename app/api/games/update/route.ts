import { NextResponse } from 'next/server'
import { requireHostGame } from '@/lib/games'
import { UpdateGameSchema } from '@/lib/validate'

export async function PATCH(request: Request) {
  const parsed = UpdateGameSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check your inputs and try again.' }, { status: 400 })
  }

  const { game_id, ...fields } = parsed.data
  const ctx = await requireHostGame(game_id)
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  if (ctx.game.status === 'active' || ctx.game.status === 'complete') {
    return NextResponse.json(
      { error: 'This game has already started and can no longer be edited.' },
      { status: 409 }
    )
  }

  // Only these fields are editable, and status is never touched here.
  const update: Record<string, string | null> = {}
  if (fields.game_name !== undefined) update.game_name = fields.game_name
  if (fields.game_date !== undefined) update.game_date = fields.game_date
  if (fields.theme !== undefined) update.theme = fields.theme
  if (fields.video_url !== undefined) update.video_url = fields.video_url || null

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: true })
  }

  const { error } = await ctx.admin.from('party_games').update(update).eq('id', ctx.game.id)
  if (error) {
    console.error('[games/update]', error.message)
    return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
