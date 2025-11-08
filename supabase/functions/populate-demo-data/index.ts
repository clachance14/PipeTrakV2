/**
 * Edge Function: populate-demo-data
 * Feature: 023-demo-data-population
 *
 * Populates demo project with realistic industrial construction data.
 * Called asynchronously by demo-signup after skeleton creation.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { populateDemoData } from './insertion-logic.ts'
import type {
  PopulateDemoDataRequest,
  PopulateDemoDataResponse
} from './types.ts'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })

    // Parse request body
    const requestBody: PopulateDemoDataRequest = await req.json()
    const { projectId, organizationId } = requestBody

    // Validate request
    if (!projectId || !organizationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: projectId and organizationId'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[populate-demo-data] Received request for project: ${projectId}`)

    // Execute population
    const result: PopulateDemoDataResponse = await populateDemoData(
      supabase,
      projectId,
      organizationId
    )

    // Return response
    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('[populate-demo-data] Unhandled error:', error)

    const errorMessage = error instanceof Error ? error.message : String(error)

    const response: PopulateDemoDataResponse = {
      success: false,
      componentsCreated: 0,
      drawingsCreated: 0,
      weldsCreated: 0,
      milestonesUpdated: 0,
      weldersAssigned: 0,
      executionTimeMs: 0,
      errors: [errorMessage]
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
