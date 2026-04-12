import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function PATCH(request: Request) {
  const { game_id, game_name, game_date, theme, video_url } = await request.json()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('party_games')
    .update({ game_name, game_date, theme, video_url, status: 'lobby' })
    .eq('id', game_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
