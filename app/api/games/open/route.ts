import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'

const OpenGameSchema = z.object({
  game_id: z.string().uuid(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = OpenGameSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: game } = await supabase
    .from('party_games')
    .select('id')
    .eq('id', parsed.data.game_id)
    .eq('host_id', user.id)
    .single()

  if (!game) {
    return NextResponse.json({ error: 'Game not found or not authorized' }, { status: 403 })
  }

  const { error } = await supabase
    .from('party_games')
    .update({ status: 'invited' })
    .eq('id', parsed.data.game_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
