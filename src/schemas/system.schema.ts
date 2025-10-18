import { z } from 'zod'

export const systemFormSchema = z.object({
  name: z.string()
    .min(1, 'System name is required')
    .max(50, 'System name must be 50 characters or less')
    .trim(),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional()
})

export type SystemFormData = z.infer<typeof systemFormSchema>
