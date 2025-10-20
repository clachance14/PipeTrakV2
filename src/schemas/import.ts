/**
 * Zod Schemas for CSV Import
 * Validation schemas for import requests and responses
 */

import { z } from 'zod';

/**
 * CSV Row Schema
 * Validates individual CSV rows during import
 */
export const csvRowSchema = z.object({
  DRAWING: z.string().min(1, 'Drawing number required'),
  TYPE: z.enum(['Valve', 'Instrument', 'Support', 'Pipe', 'Fitting', 'Flange'], {
    message: 'Invalid component type. Expected: Valve, Instrument, Support, Pipe, Fitting, Flange'
  }),
  QTY: z.coerce.number().int().min(0, 'Quantity must be ≥0'),
  'CMDTY CODE': z.string().min(1, 'Commodity code required'),
  SPEC: z.string().default(''),
  DESCRIPTION: z.string().default(''),
  SIZE: z.string().default(''),
  Comments: z.string().default(''),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

/**
 * Component Attributes Schema
 * Validates the attributes JSONB field
 */
export const componentAttributesSchema = z.object({
  spec: z.string(),
  description: z.string(),
  size: z.string(),
  cmdty_code: z.string().min(1, 'Commodity code required'),
  comments: z.string(),
  original_qty: z.number().int().min(1, 'Quantity must be ≥1'),
});

export type ComponentAttributes = z.infer<typeof componentAttributesSchema>;

/**
 * Import Error Schema
 * Structure for validation error reports
 */
export const importErrorSchema = z.object({
  row: z.number(),
  column: z.string(),
  reason: z.string(),
});

export type ImportError = z.infer<typeof importErrorSchema>;

/**
 * Import Result Schema
 * Response from import-takeoff Edge Function
 */
export const importResultSchema = z.object({
  success: z.boolean(),
  componentsCreated: z.number().optional(),
  rowsProcessed: z.number().optional(),
  rowsSkipped: z.number().optional(),
  errors: z.array(importErrorSchema).optional(),
  errorCsv: z.string().optional(),
});

export type ImportResult = z.infer<typeof importResultSchema>;

/**
 * Import Request Schema
 * Payload sent to import-takeoff Edge Function
 */
export const importRequestSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  csvContent: z.string().min(1, 'CSV content required'),
  userId: z.string().uuid('Invalid user ID'),
});

export type ImportRequest = z.infer<typeof importRequestSchema>;
