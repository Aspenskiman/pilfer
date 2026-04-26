'use server'

import { createClient } from '@/lib/supabase-server'
import { SubmitGiftSchema } from '@/lib/validate'

export async function submitGift(formData: {
  game_id: string
  player_id: string
  gift_name: string
  description?: string
  delivery_info?: string
  image_url?: string
}) {
  const parsed = SubmitGiftSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('gifts')
    .insert({
      game_id: parsed.data.game_id,
      submitted_by: parsed.data.player_id,
      gift_name: parsed.data.gift_name,
      description: parsed.data.description ?? null,
      delivery_info: parsed.data.delivery_info ?? null,
      image_url: parsed.data.image_url ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: 'Failed to submit gift' }
  return { gift_id: data.id }
}
