/**
 * Zod Validation Schemas for Milestone Updates
 * Feature: 010-let-s-spec (Drawing-Centered Component Progress Table)
 *
 * This file defines runtime validation schemas for milestone update payloads.
 * Used to validate user input before sending mutations to the database.
 */

import { z } from 'zod'

// ============================================================================
// Component Type Schema
// ============================================================================

/**
 * Valid component types (matches TypeScript ComponentType union)
 */
export const componentTypeSchema = z.enum([
  'spool',
  'field_weld',
  'support',
  'valve',
  'fitting',
  'flange',
  'instrument',
  'tubing',
  'hose',
  'misc_component',
  'threaded_pipe',
  'pipe',
])

// ============================================================================
// Milestone Update Payload Schema
// ============================================================================

/**
 * Schema for milestone update payload
 * Validates the structure sent to the update_component_milestone RPC function
 */
export const milestoneUpdateSchema = z.object({
  /** Component UUID to update */
  component_id: z.string().uuid({
    message: 'component_id must be a valid UUID',
  }),

  /** Milestone name to update */
  milestone_name: z.string().min(1, {
    message: 'milestone_name cannot be empty',
  }).max(50, {
    message: 'milestone_name must be 50 characters or less',
  }),

  /** New milestone value: boolean (discrete) or number 0-100 (partial) */
  value: z.union([
    z.boolean(),
    z.number().min(0, {
      message: 'Partial milestone value must be at least 0',
    }).max(100, {
      message: 'Partial milestone value must be at most 100',
    }),
  ]),

  /** User UUID performing the update */
  user_id: z.string().uuid({
    message: 'user_id must be a valid UUID',
  }),
})

/**
 * Inferred TypeScript type from milestoneUpdateSchema
 * Use this type for function parameters instead of defining manually
 */
export type MilestoneUpdateInput = z.infer<typeof milestoneUpdateSchema>

// ============================================================================
// Discrete Milestone Schema
// ============================================================================

/**
 * Schema specifically for discrete (boolean) milestone updates
 */
export const discreteMilestoneUpdateSchema = milestoneUpdateSchema.extend({
  value: z.boolean({
    message: 'Discrete milestones must have a boolean value',
  }),
})

export type DiscreteMilestoneUpdateInput = z.infer<typeof discreteMilestoneUpdateSchema>

// ============================================================================
// Partial Milestone Schema
// ============================================================================

/**
 * Schema specifically for partial (0-100%) milestone updates
 * Enforces 5% step increments for UI consistency
 */
export const partialMilestoneUpdateSchema = milestoneUpdateSchema.extend({
  value: z.number()
    .min(0, { message: 'Value must be at least 0%' })
    .max(100, { message: 'Value must be at most 100%' })
    .refine(
      (val) => val % 5 === 0,
      { message: 'Value must be a multiple of 5 (0, 5, 10, ..., 100)' }
    ),
})

export type PartialMilestoneUpdateInput = z.infer<typeof partialMilestoneUpdateSchema>

// ============================================================================
// Identity Key Schema
// ============================================================================

/**
 * Schema for identity_key JSONB structure
 * Used when validating component identity keys
 */
export const identityKeySchema = z.object({
  drawing_norm: z.string().min(1),
  commodity_code: z.string().min(1),
  size: z.string(), // Can be empty string or "NOSIZE"
  seq: z.number().int().positive(),
})

export type IdentityKeyInput = z.infer<typeof identityKeySchema>

// ============================================================================
// Milestone Config Schema
// ============================================================================

/**
 * Schema for milestone configuration within progress templates
 */
export const milestoneConfigSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(1).max(100),
  order: z.number().int().positive(),
  is_partial: z.boolean(),
  requires_welder: z.boolean(),
})

export type MilestoneConfigInput = z.infer<typeof milestoneConfigSchema>

// ============================================================================
// Progress Template Schema
// ============================================================================

/**
 * Schema for progress template validation
 */
export const progressTemplateSchema = z.object({
  id: z.string().uuid(),
  component_type: componentTypeSchema,
  version: z.number().int().positive(),
  workflow_type: z.enum(['discrete', 'quantity', 'hybrid']),
  milestones_config: z.array(milestoneConfigSchema).refine(
    (milestones) => {
      // Validate that all weights sum to 100
      const totalWeight = milestones.reduce((sum, m) => sum + m.weight, 0)
      return totalWeight === 100
    },
    { message: 'Milestone weights must sum to 100' }
  ).refine(
    (milestones) => {
      // Validate that all order values are unique
      const orders = milestones.map(m => m.order)
      return new Set(orders).size === orders.length
    },
    { message: 'Milestone order values must be unique' }
  ).refine(
    (milestones) => {
      // Validate that all names are unique
      const names = milestones.map(m => m.name)
      return new Set(names).size === names.length
    },
    { message: 'Milestone names must be unique' }
  ),
})

export type ProgressTemplateInput = z.infer<typeof progressTemplateSchema>

// ============================================================================
// URL State Schema
// ============================================================================

/**
 * Schema for URL query parameters
 */
export const drawingTableURLParamsSchema = z.object({
  expanded: z.string().optional(), // Comma-separated UUIDs
  search: z.string().optional(),
  status: z.enum(['all', 'not-started', 'in-progress', 'complete']).optional(),
})

export type DrawingTableURLParamsInput = z.infer<typeof drawingTableURLParamsSchema>

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Safe parse with detailed error messages
 * Returns { success: true, data } or { success: false, error: string }
 */
export function safeParseMilestoneUpdate(data: unknown) {
  const result = milestoneUpdateSchema.safeParse(data)

  if (!result.success) {
    const firstError = result.error.issues[0]
    return {
      success: false as const,
      error: firstError?.message || 'Validation failed',
    }
  }

  return {
    success: true as const,
    data: result.data,
  }
}

/**
 * Validate and throw on error (use in mutation functions)
 */
export function validateMilestoneUpdateOrThrow(data: unknown): MilestoneUpdateInput {
  return milestoneUpdateSchema.parse(data)
}
