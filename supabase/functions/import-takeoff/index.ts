/**
 * Import Takeoff Edge Function V2 - JSON Payload
 * Handles structured JSON imports with client-side validation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { ImportPayload, ImportResult } from './types.ts';
import { validatePayload } from './payload-validator.ts';
import { processImportV2 } from './transaction-v2.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authenticated user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      const errorResult: ImportResult = {
        success: false,
        componentsCreated: 0,
        drawingsCreated: 0,
        drawingsUpdated: 0,
        metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
        componentsByType: {},
        duration: 0,
        error: 'Missing authorization header'
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's auth to verify identity
    const supabaseAuth = createClient(supabaseUrl, anonKey);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      const errorResult: ImportResult = {
        success: false,
        componentsCreated: 0,
        drawingsCreated: 0,
        drawingsUpdated: 0,
        metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
        componentsByType: {},
        duration: 0,
        error: 'Invalid or expired authentication token'
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse request body as JSON
    let payload: any;
    try {
      payload = await req.json();
    } catch (parseError) {
      const errorResult: ImportResult = {
        success: false,
        componentsCreated: 0,
        drawingsCreated: 0,
        drawingsUpdated: 0,
        metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
        componentsByType: {},
        duration: 0,
        error: 'Invalid JSON payload',
        details: [
          {
            row: 0,
            issue: parseError instanceof Error ? parseError.message : 'Failed to parse JSON'
          }
        ]
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payload structure and content (defense-in-depth)
    const validationResult = validatePayload(payload);
    if (!validationResult.valid) {
      const errorResult: ImportResult = {
        success: false,
        componentsCreated: 0,
        drawingsCreated: 0,
        drawingsUpdated: 0,
        metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
        componentsByType: {},
        duration: 0,
        error: 'Payload validation failed',
        details: validationResult.errors
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cast to typed payload after validation
    const typedPayload = payload as ImportPayload;

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify user has access to project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', typedPayload.projectId)
      .single();

    if (projectError || !project) {
      const errorResult: ImportResult = {
        success: false,
        componentsCreated: 0,
        drawingsCreated: 0,
        drawingsUpdated: 0,
        metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
        componentsByType: {},
        duration: 0,
        error: 'Project not found or access denied'
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user belongs to the project's organization
    const { data: userRecord } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!userRecord || userRecord.organization_id !== project.organization_id) {
      const errorResult: ImportResult = {
        success: false,
        componentsCreated: 0,
        drawingsCreated: 0,
        drawingsUpdated: 0,
        metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
        componentsByType: {},
        duration: 0,
        error: 'Unauthorized: You do not have access to this project'
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process import (metadata → drawings → components)
    let result: ImportResult;
    try {
      result = await processImportV2(supabaseUrl, serviceRoleKey, typedPayload);
    } catch (processingError) {
      console.error('Import processing error:', processingError);
      result = {
        success: false,
        componentsCreated: 0,
        drawingsCreated: 0,
        drawingsUpdated: 0,
        metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
        componentsByType: {},
        duration: 0,
        error: `Import processing failed: ${processingError instanceof Error ? processingError.message : String(processingError)}`,
        details: [
          {
            row: 0,
            issue: processingError instanceof Error ? processingError.stack || processingError.message : String(processingError)
          }
        ]
      };
    }

    // Refresh materialized views to update dashboard immediately
    if (result.success) {
      try {
        await supabase.rpc('refresh_materialized_views');
      } catch (refreshError) {
        console.error('Failed to refresh materialized views:', refreshError);
        // Don't fail the import if refresh fails
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400, // Use 400 for validation/business logic errors, not 500
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const errorResult: ImportResult = {
      success: false,
      componentsCreated: 0,
      drawingsCreated: 0,
      drawingsUpdated: 0,
      metadataCreated: { areas: 0, systems: 0, testPackages: 0 },
      componentsByType: {},
      duration: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: [
        {
          row: 0,
          issue: error instanceof Error ? error.message : 'Unknown error'
        }
      ]
    };

    return new Response(
      JSON.stringify(errorResult),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
