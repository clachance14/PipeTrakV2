/**
 * Edge Function: Import Field Welds from CSV (Feature 014)
 * Handles CSV upload, validation, and transaction processing
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseCsv, validateHeaders } from './parser.ts'
import { validateRow, validateUniqueWeldIds } from './validator.ts'
import { processTransaction } from './transaction.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse form data
    const formData = await req.formData()
    const projectId = formData.get('project_id') as string
    const csvFile = formData.get('csv_file') as File

    if (!projectId || !csvFile) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: project_id, csv_file',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (csvFile.size > maxSize) {
      return new Response(
        JSON.stringify({
          error: `File size exceeds 5MB limit (actual: ${(csvFile.size / 1024 / 1024).toFixed(2)}MB)`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Read CSV content
    const csvContent = await csvFile.text()

    // Parse CSV
    const { data: rows, errors: parseErrors } = parseCsv(csvContent)

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No valid rows found in CSV',
          errors: parseErrors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate headers
    const headers = Object.keys(rows[0])
    const headerErrors = validateHeaders(headers)

    if (headerErrors.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid CSV headers',
          errors: headerErrors.map((msg) => ({ row: 0, message: msg })),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate rows
    const validationErrors: Array<{ row: number; column?: string; message: string }> = []

    rows.forEach((row, index) => {
      const rowNumber = index + 2 // +2 for header row and 1-indexed
      const rowErrors = validateRow(row, rowNumber)
      validationErrors.push(...rowErrors)
    })

    // Check for duplicate weld IDs
    const duplicateErrors = validateUniqueWeldIds(rows)
    validationErrors.push(...duplicateErrors)

    // If there are validation errors, return them without processing
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({
          success_count: 0,
          error_count: validationErrors.length,
          errors: validationErrors,
        }),
        {
          status: 200, // Still 200 because validation worked, just had invalid data
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Process transaction
    const result = await processTransaction(
      supabaseClient,
      rows,
      projectId,
      user.id
    )

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Import error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
