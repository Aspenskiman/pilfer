import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { createFreeGame } from '@/lib/games'
import { GameNameSchema } from '@/lib/validate'

const CreateGameSchema = z.object({
  game_name: GameNameSchema,
  game_date: z.string().datetime({ offset: true }),
  tier: z.literal('free'),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = CreateGameSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the game name and date.' }, { status: 400 })
  }

  const result = await createFreeGame(user.id, parsed.data.game_name, parsed.data.game_date)
  if ('error' in result) {
    console.error('[games/create]', result.error)
    return NextResponse.json({ error: 'Failed to create game. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ game_id: result.game_id })
}
