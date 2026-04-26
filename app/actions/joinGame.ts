'use server'

import { createClient } from '@/lib/supabase-server'
import { JoinGameSchema } from '@/lib/validate'

export async function joinGame(formData: { display_name: string; game_id: string }) {
  const parsed = JoinGameSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const session_token = crypto.randomUUID()

  const { data, error } = await supabase
    .from('players')
    .insert({
      game_id: parsed.data.game_id,
      display_name: parsed.data.display_name,
      session_token,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) return { error: 'Failed to join game' }

  return { player_id: data.id, session_token }
}
