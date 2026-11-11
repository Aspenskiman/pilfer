'use server'

import { createClient } from '@/lib/supabase-server'
import { JoinGameSchema } from '@/lib/validate'

type JoinResult =
  | { player_id: string; session_token: string; role: 'participant' | 'spectator' }
  | { error: string; full?: boolean }

export async function joinGame(formData: {
  display_name: string
  game_id: string
  role?: 'participant' | 'spectator'
}): Promise<JoinResult> {
  const parsed = JoinGameSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.display_name?.[0] ?? 'Please check your name.' }
  }

  const supabase = await createClient()
  // The database function enforces the player cap and issues the session token.
  const { data, error } = await supabase.rpc('pilfer_join_game', {
    p_game_id: parsed.data.game_id,
    p_display_name: parsed.data.display_name,
    p_role: parsed.data.role,
  })

  if (error || !data) {
    console.error('[joinGame]', error?.message)
    return { error: 'Failed to join. Please try again.' }
  }
  if (!data.success) {
    if (data.error === 'full') {
      return { error: 'This game is full for gift givers — you can still join as a spectator', full: true }
    }
    return { error: data.error ?? 'Failed to join. Please try again.' }
  }

  return { player_id: data.player_id, session_token: data.session_token, role: data.role }
}
