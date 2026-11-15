import { z } from 'zod'

export const DisplayNameSchema = z.string()
  .min(1, 'Name is required')
  .max(30, 'Name must be 30 characters or less')
  .trim()

export const GameNameSchema = z.string()
  .min(1, 'Game name is required')
  .max(60, 'Game name must be 60 characters or less')
  .trim()

export const GiftNameSchema = z.string()
  .min(1, 'Gift name is required')
  .max(40, 'Gift name must be 40 characters or less')
  .trim()

export const GiftDescriptionSchema = z.string()
  .max(200, 'Description must be 200 characters or less')
  .trim()
  .optional()

export const GiftDeliveryInfoSchema = z.string()
  .max(300, 'Delivery info must be 300 characters or less')
  .trim()
  .optional()

export const ImageUrlSchema = z.string()
  .url('Must be a valid URL')
  .max(500)

const THEME_IDS = [
  'winter_celebration', 'birthday_bash', 'shower_party', 'team_mode',
  'fall_gathering', 'just_for_fun', 'summer_vibes', 'celebration',
] as const

const HttpsUrlSchema = z.string().url().max(500).refine((u) => u.startsWith('https://'), {
  message: 'Link must start with https://',
})

// Partial update — only the fields sent are changed. Never touches status.
export const UpdateGameSchema = z.object({
  game_id: z.string().uuid(),
  game_name: GameNameSchema.optional(),
  game_date: z.string().datetime({ offset: true }).optional(),
  theme: z.enum(THEME_IDS).optional(),
  video_url: HttpsUrlSchema.nullable().optional().or(z.literal('')),
})

export const CheckoutSchema = z.object({
  tier: z.enum(['personal_10', 'personal_25', 'personal_50', 'team_25', 'team_50']),
  game_name: GameNameSchema,
  game_date: z.string().datetime({ offset: true }),
})

export const JoinGameSchema = z.object({
  display_name: DisplayNameSchema,
  game_id: z.string().uuid(),
  role: z.enum(['participant', 'spectator']).default('participant'),
})

export const SubmitGiftSchema = z.object({
  game_id: z.string().uuid(),
  player_id: z.string().uuid(),
  session_token: z.string().max(100).nullable().optional(),
  gift_name: GiftNameSchema,
  description: GiftDescriptionSchema,
  delivery_info: GiftDeliveryInfoSchema,
  image_url: ImageUrlSchema,
})
