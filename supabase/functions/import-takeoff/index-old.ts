/**
 * Import Takeoff Edge Function
 * Handles CSV material takeoff imports with validation and transaction processing
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { parseCsv } from './parser.ts';
import { validateCsvContent, checkDuplicateIdentityKeys } from './validator.ts';
import { processImport } from './transaction.ts';

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
      return new Response(
        JSON.stringify({
          success: false,
          errors: [{
            row: 0,
            column: '',
            reason: 'Missing authorization header'
          }]
        }),
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

    // Get authenticated user by passing the JWT token directly
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: [{
            row: 0,
            column: '',
            reason: 'Invalid or expired authentication token'
          }]
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id; // Use authenticated userId from JWT

    // Parse request body
    const { projectId, csvContent } = await req.json();

    if (!projectId || !csvContent) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: [{
            row: 0,
            column: '',
            reason: 'Missing required fields: projectId, csvContent'
          }]
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify user has access to project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: [{
            row: 0,
            column: '',
            reason: 'Project not found or access denied'
          }]
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user belongs to the project's organization (single-org model)
    const { data: userRecord } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!userRecord || userRecord.organization_id !== project.organization_id) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: [{
            row: 0,
            column: '',
            reason: 'Unauthorized: You do not have access to this project'
          }]
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse CSV
    const parseResult = parseCsv(csvContent);
    if (!parseResult.success || !parseResult.rows) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: parseResult.errors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rows = parseResult.rows;

    // Extract headers
    const headers = Object.keys(rows[0] || {});

    // Validate CSV content
    const validationResult = validateCsvContent(csvContent, rows, headers);
    if (!validationResult.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: validationResult.errors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicate identity keys
    const duplicateErrors = checkDuplicateIdentityKeys(rows);
    if (duplicateErrors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: duplicateErrors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process import (create drawings and components)
    const result = await processImport(supabaseUrl, serviceRoleKey, projectId, rows);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: [{
            row: 0,
            column: '',
            reason: result.error || 'Import failed'
          }]
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh materialized views to update dashboard immediately
    try {
      await supabase.rpc('refresh_materialized_views');
    } catch (refreshError) {
      console.error('Failed to refresh materialized views:', refreshError);
      // Don't fail the import if refresh fails, it will refresh eventually via cron
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        errors: [{
          row: 0,
          column: '',
          reason: error instanceof Error ? error.message : 'Unknown error'
        }]
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
