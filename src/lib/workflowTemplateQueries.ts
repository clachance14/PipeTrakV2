import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type WorkflowTemplate = Database['public']['Tables']['package_workflow_templates']['Row'];

/**
 * Fetch workflow template for a specific test type
 * Returns stages in stage_order sequence
 */
export async function getWorkflowTemplateForTestType(
  testType: string
): Promise<WorkflowTemplate[]> {
  const { data, error } = await supabase
    .from('package_workflow_templates')
    .select('*')
    .eq('test_type', testType)
    .order('stage_order', { ascending: true });

  if (error) {
    console.error('Failed to fetch workflow template:', error);
    throw new Error(`Could not load workflow template for test type: ${testType}`);
  }

  if (!data || data.length === 0) {
    // No template exists for this test type
    console.warn(`No workflow template found for test type: ${testType}`);
    return [];
  }

  return data;
}

/**
 * Check if a specific stage is required for a test type
 */
export async function isStageRequiredForTestType(
  testType: string,
  stageName: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('package_workflow_templates')
    .select('is_required')
    .eq('test_type', testType)
    .eq('stage_name', stageName)
    .maybeSingle();

  if (error) {
    console.error('Failed to check stage requirement:', error);
    return false; // Safe default: treat as not required if query fails
  }

  return data?.is_required ?? false;
}
