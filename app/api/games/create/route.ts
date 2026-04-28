import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { GameNameSchema } from '@/lib/validate'
import { z } from 'zod'

const CreateGameSchema = z.object({
  game_name: GameNameSchema,
  tier: z.literal('free'),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = CreateGameSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('party_games')
    .insert({
      host_id: user.id,
      game_name: parsed.data.game_name,
      join_code: generateJoinCode(),
      status: 'setup',
      theme: 'winter',
      player_limit: 8,
      game_type: 'pilfer',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ game_id: data.id })
}

function generateJoinCode(): string {
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(array).map(b => chars[b % chars.length]).join('')
}
