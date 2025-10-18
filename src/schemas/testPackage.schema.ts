import { z } from 'zod'

export const testPackageFormSchema = z.object({
  name: z.string()
    .min(1, 'Test package name is required')
    .max(100, 'Test package name must be 100 characters or less')
    .trim(),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional(),
  target_date: z.date()
    .nullable()
    .optional()
})

export type TestPackageFormData = z.infer<typeof testPackageFormSchema>
