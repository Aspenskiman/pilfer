import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { UpdateGameSchema } from '@/lib/validate'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = UpdateGameSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { game_id, game_name, game_date, theme, video_url } = parsed.data

  const { data, error } = await supabase
    .from('party_games')
    .update({ game_name, game_date, theme, video_url, status: 'invited' })
    .eq('id', game_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
