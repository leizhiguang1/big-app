import { z } from 'zod'
import { permissionsSchema } from './role-permissions'

export const roleInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  is_active: z.boolean(),
  permissions: permissionsSchema,
})

export type RoleInput = z.infer<typeof roleInputSchema>
