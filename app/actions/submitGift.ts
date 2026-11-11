'use server'

import { createClient } from '@/lib/supabase-server'
import { SubmitGiftSchema } from '@/lib/validate'

type SubmitResult =
  | { gift_id: string }
  | { error: string }
  | { fieldErrors: Record<string, string[]> }

export async function submitGift(formData: {
  game_id: string
  player_id: string
  session_token?: string | null
  gift_name: string
  description?: string
  delivery_info?: string
  image_url: string
}): Promise<SubmitResult> {
  const parsed = SubmitGiftSchema.safeParse(formData)
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('pilfer_submit_gift', {
    p_game_id: parsed.data.game_id,
    p_player_id: parsed.data.player_id,
    p_session_token: parsed.data.session_token ?? null,
    p_gift_name: parsed.data.gift_name,
    p_description: parsed.data.description ?? null,
    p_delivery_info: parsed.data.delivery_info ?? null,
    p_image_url: parsed.data.image_url,
  })

  if (error || !data) {
    console.error('[submitGift]', error?.message)
    return { error: 'Failed to submit gift. Please try again.' }
  }
  if (!data.success) return { error: data.error ?? 'Failed to submit gift.' }
  return { gift_id: data.gift_id }
}
