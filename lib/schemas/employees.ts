import { z } from 'zod'

export const employeeInputSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(80),
  last_name: z.string().trim().min(1, 'Last name is required').max(80),
  email: z
    .string()
    .trim()
    .email('Invalid email')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  role_id: z.string().uuid().nullable().optional(),
  position_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean(),
})

export type EmployeeInput = z.infer<typeof employeeInputSchema>
