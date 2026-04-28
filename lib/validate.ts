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
  .optional()
  .or(z.literal(''))

export const UpdateGameSchema = z.object({
  game_id: z.string().uuid(),
  game_name: GameNameSchema,
  game_date: z.string().min(1, 'Party date and time is required'),
  theme: z.enum(['winter', 'birthday', 'shower', 'team', 'fall', 'fun', 'summer', 'celebrate']),
  video_url: z.string().url().max(500).optional().or(z.literal('')),
})

export const CheckoutSchema = z.object({
  tier: z.enum(['gathering', 'party', 'bash']),
  game_name: GameNameSchema,
})

export const JoinGameSchema = z.object({
  display_name: DisplayNameSchema,
  game_id: z.string().uuid(),
})

export const SubmitGiftSchema = z.object({
  game_id: z.string().uuid(),
  player_id: z.string().uuid(),
  gift_name: GiftNameSchema,
  description: GiftDescriptionSchema,
  delivery_info: GiftDeliveryInfoSchema,
  image_url: ImageUrlSchema,
})
