/**
 * Process Drawing Edge Function
 * Accepts a storage file path, extracts title block and BOM via AI,
 * and stores the results in drawing_bom_items.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { ProcessDrawingRequest, ProcessingResult } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function processDrawing(
  _supabaseUrl: string,
  _serviceRoleKey: string,
  _projectId: string,
  _filePath: string,
  _userId: string,
): Promise<ProcessingResult> {
  // Stub implementation — full processing logic will be added in subsequent tasks
  return {
    success: true,
    drawingsProcessed: 0,
    componentsCreated: 0,
    bomItemsStored: 0,
    errors: [],
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authenticated user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      const errorResult: ProcessingResult = {
        success: false,
        drawingsProcessed: 0,
        componentsCreated: 0,
        bomItemsStored: 0,
        errors: ['Missing authorization header'],
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
      const errorResult: ProcessingResult = {
        success: false,
        drawingsProcessed: 0,
        componentsCreated: 0,
        bomItemsStored: 0,
        errors: ['Invalid or expired authentication token'],
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userId = user.id;

    // Parse request body as JSON
    let body: ProcessDrawingRequest;
    try {
      const raw = await req.json();

      if (!raw.projectId || typeof raw.projectId !== 'string') {
        const errorResult: ProcessingResult = {
          success: false,
          drawingsProcessed: 0,
          componentsCreated: 0,
          bomItemsStored: 0,
          errors: ['Missing required field: projectId'],
        };

        return new Response(
          JSON.stringify(errorResult),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (!raw.filePath || typeof raw.filePath !== 'string') {
        const errorResult: ProcessingResult = {
          success: false,
          drawingsProcessed: 0,
          componentsCreated: 0,
          bomItemsStored: 0,
          errors: ['Missing required field: filePath'],
        };

        return new Response(
          JSON.stringify(errorResult),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      body = { projectId: raw.projectId, filePath: raw.filePath };
    } catch (parseError) {
      const errorResult: ProcessingResult = {
        success: false,
        drawingsProcessed: 0,
        componentsCreated: 0,
        bomItemsStored: 0,
        errors: [
          `Invalid JSON payload: ${parseError instanceof Error ? parseError.message : 'Failed to parse JSON'}`,
        ],
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify user has access to project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', body.projectId)
      .single();

    if (projectError || !project) {
      const errorResult: ProcessingResult = {
        success: false,
        drawingsProcessed: 0,
        componentsCreated: 0,
        bomItemsStored: 0,
        errors: ['Project not found or access denied'],
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Verify user belongs to the project's organization
    const { data: userRecord } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!userRecord || userRecord.organization_id !== project.organization_id) {
      const errorResult: ProcessingResult = {
        success: false,
        drawingsProcessed: 0,
        componentsCreated: 0,
        bomItemsStored: 0,
        errors: ['Unauthorized: You do not have access to this project'],
      };

      return new Response(
        JSON.stringify(errorResult),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Process the drawing
    let result: ProcessingResult;
    try {
      result = await processDrawing(supabaseUrl, serviceRoleKey, body.projectId, body.filePath, userId);
    } catch (processingError) {
      console.error('Drawing processing error:', processingError);
      result = {
        success: false,
        drawingsProcessed: 0,
        componentsCreated: 0,
        bomItemsStored: 0,
        errors: [
          `Processing failed: ${processingError instanceof Error ? processingError.message : String(processingError)}`,
        ],
      };
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const errorResult: ProcessingResult = {
      success: false,
      drawingsProcessed: 0,
      componentsCreated: 0,
      bomItemsStored: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };

    return new Response(
      JSON.stringify(errorResult),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
