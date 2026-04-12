import { z } from 'zod'

export const positionInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  is_active: z.boolean(),
})

export type PositionInput = z.infer<typeof positionInputSchema>
