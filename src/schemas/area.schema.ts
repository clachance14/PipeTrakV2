import { z } from 'zod'

export const areaFormSchema = z.object({
  name: z.string()
    .min(1, 'Area name is required')
    .max(50, 'Area name must be 50 characters or less')
    .trim(),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional()
})

export type AreaFormData = z.infer<typeof areaFormSchema>
