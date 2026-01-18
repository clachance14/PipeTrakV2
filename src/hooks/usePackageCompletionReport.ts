/**
 * TanStack Query hook for package completion report
 * Feature 030: Test Package Workflow - Component list grouped by drawing
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePackageComponents } from './usePackages';
import type {
  DrawingGroup,
  WeldLogEntry,
  NDESummary,
  PackageCompletionReport,
  ComponentSummaryRow,
  SupportSummaryRow
} from '@/types/packageReport';
import type { PackageComponent } from '@/types/package.types';
import type { Database } from '@/types/database.types';

type FieldWeldRow = Database['public']['Tables']['field_welds']['Row'];

/**
 * Query package completion report with component/support summaries and workflow status
 *
 * @param packageId - Test package ID
 * @param projectId - Project ID for RLS filtering
 * @returns Complete package completion report data
 */
export function usePackageCompletionReport(
  packageId: string | undefined,
  projectId: string
): UseQueryResult<PackageCompletionReport, Error> {
  // Fetch package components (both direct + inherited)
  const componentsQuery = usePackageComponents(packageId, projectId);

  return useQuery({
    queryKey: ['package-completion-report', { package_id: packageId, project_id: projectId }],
    queryFn: async (): Promise<PackageCompletionReport> => {
      if (!packageId) {
        // Return empty report structure when no packageId
        return {
          package_id: '',
          package_name: '',
          test_type: null,
          target_date: null,
          test_pressure: null,
          test_pressure_unit: null,
          piping_spec: null,
          component_summary: [],
          support_summary: [],
          is_draft: true,
          drawing_groups: [],
          total_components: 0,
          total_unique_supports: 0,
          overall_nde_summary: {
            total_welds: 0,
            nde_required_count: 0,
            nde_pass_count: 0,
            nde_fail_count: 0,
            nde_pending_count: 0,
          },
        };
      }

      const components = componentsQuery.data || [];

      // Fetch package metadata
      const { data: packageData, error: packageError } = await supabase
        .from('test_packages')
        .select('id, name, test_type, target_date, test_pressure, test_pressure_unit')
        .eq('id', packageId)
        .single();

      if (packageError) throw packageError;

      // Fetch workflow stages for draft/final status
      const { data: workflowStages, error: stagesError } = await supabase
        .from('package_workflow_stages')
        .select('stage_order, status')
        .eq('package_id', packageId);

      if (stagesError) throw stagesError;

      // Check if package is draft (any incomplete stages)
      const is_draft = checkIsDraft(workflowStages || []);

      // Early return if no components
      if (components.length === 0) {
        return {
          package_id: packageData.id,
          package_name: packageData.name,
          test_type: packageData.test_type,
          target_date: packageData.target_date,
          test_pressure: packageData.test_pressure,
          test_pressure_unit: packageData.test_pressure_unit,
          piping_spec: null,
          component_summary: [],
          support_summary: [],
          is_draft,
          drawing_groups: [],
          total_components: 0,
          total_unique_supports: 0,
          overall_nde_summary: {
            total_welds: 0,
            nde_required_count: 0,
            nde_pass_count: 0,
            nde_fail_count: 0,
            nde_pending_count: 0,
          },
        };
      }

      // Fetch field welds for all components
      const componentIds = components.map(c => c.id);
      const { data: fieldWelds, error: weldsError } = await supabase
        .from('field_welds')
        .select('*')
        .eq('project_id', projectId)
        .in('component_id', componentIds);

      if (weldsError) throw weldsError;

      // Calculate package-level summaries
      const component_summary = calculateComponentSummary(components);
      const support_summary = calculateSupportSummary(components);

      // Group components by drawing_id
      const drawingMap = new Map<string, PackageComponent[]>();
      components.forEach(component => {
        const drawingId = component.drawing_id || 'unassigned';
        const existing = drawingMap.get(drawingId) || [];
        drawingMap.set(drawingId, [...existing, component]);
      });

      // Build drawing groups
      const drawingGroups: DrawingGroup[] = Array.from(drawingMap.entries())
        .filter(([drawingId]) => drawingId !== 'unassigned') // Exclude components without drawings
        .map(([drawingId, drawingComponents]) => {
          // Get drawing metadata from first component
          const firstComponent = drawingComponents[0];
          if (!firstComponent) {
            throw new Error(`Drawing ${drawingId} has no components`);
          }
          const drawing_no_norm = firstComponent.drawing_no_norm || 'Unknown';

          // Calculate unique supports count
          const uniqueSupportsCount = calculateUniqueSupports(drawingComponents);

          // Filter welds for this drawing's components
          const componentIdsForDrawing = drawingComponents.map(c => c.id);
          const drawingWelds = (fieldWelds || []).filter(weld =>
            componentIdsForDrawing.includes(weld.component_id)
          );

          // Build weld log entries with component context
          const weldLog = buildWeldLog(drawingWelds, drawingComponents);

          // Calculate NDE summary
          const nde_summary = calculateNDESummary(weldLog);

          // Calculate most common NPD (weld_size) and piping spec for this drawing
          const npd = getMostCommonValue(drawingWelds.map(w => w.weld_size).filter(Boolean) as string[]);
          const piping_spec = getMostCommonValue(drawingWelds.map(w => w.spec).filter(Boolean) as string[]);

          return {
            drawing_id: drawingId,
            drawing_no_norm,
            npd,
            piping_spec,
            component_count: drawingComponents.length,
            unique_supports_count: uniqueSupportsCount,
            components: drawingComponents,
            weld_log: weldLog,
            nde_summary,
          };
        })
        .sort((a, b) => a.drawing_no_norm.localeCompare(b.drawing_no_norm)); // Sort by drawing number

      // Calculate overall statistics
      const total_components = components.length;
      const total_unique_supports = calculateUniqueSupports(components);

      // Calculate overall NDE summary from all drawing groups
      const overall_nde_summary: NDESummary = {
        total_welds: 0,
        nde_required_count: 0,
        nde_pass_count: 0,
        nde_fail_count: 0,
        nde_pending_count: 0,
      };

      drawingGroups.forEach(group => {
        overall_nde_summary.total_welds += group.nde_summary.total_welds;
        overall_nde_summary.nde_required_count += group.nde_summary.nde_required_count;
        overall_nde_summary.nde_pass_count += group.nde_summary.nde_pass_count;
        overall_nde_summary.nde_fail_count += group.nde_summary.nde_fail_count;
        overall_nde_summary.nde_pending_count += group.nde_summary.nde_pending_count;
      });

      // Calculate package-level piping spec (most common across all welds)
      const allSpecs = (fieldWelds || []).map(w => w.spec).filter(Boolean) as string[];
      const packagePipingSpec = getMostCommonValue(allSpecs);

      return {
        package_id: packageData.id,
        package_name: packageData.name,
        test_type: packageData.test_type,
        target_date: packageData.target_date,
        test_pressure: packageData.test_pressure,
        test_pressure_unit: packageData.test_pressure_unit,
        piping_spec: packagePipingSpec,
        component_summary,
        support_summary,
        is_draft,
        drawing_groups: drawingGroups,
        total_components,
        total_unique_supports,
        overall_nde_summary,
      };
    },
    enabled: (!!packageId && !componentsQuery.isLoading) || !packageId, // Run when components query completes OR packageId is undefined
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get the most common value from an array of strings
 * Returns null if array is empty
 *
 * @param values - Array of string values
 * @returns Most common value or null
 */
function getMostCommonValue(values: string[]): string | null {
  if (values.length === 0) return null;

  const counts = new Map<string, number>();
  values.forEach(v => {
    counts.set(v, (counts.get(v) || 0) + 1);
  });

  let maxCount = 0;
  let mostCommon: string | null = null;
  counts.forEach((count, value) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = value;
    }
  });

  return mostCommon;
}

/**
 * Calculate unique supports count for a drawing
 * Counts distinct identity_key values where component_type = 'support'
 *
 * @param components - Components in the drawing
 * @returns Number of unique support types
 */
function calculateUniqueSupports(components: PackageComponent[]): number {
  const supports = components.filter(c => c.component_type === 'support');

  // Create unique key from identity_key (excluding seq field)
  const uniqueKeys = new Set<string>();
  supports.forEach(support => {
    if (support.identity_key && typeof support.identity_key === 'object') {
      // Create a canonical key from identity_key, excluding seq
      const key = support.identity_key as any;
      const canonicalKey = JSON.stringify({
        commodity_code: key.commodity_code,
        size: key.size,
        // Exclude seq to group duplicates with same commodity_code + size
      });
      uniqueKeys.add(canonicalKey);
    }
  });

  return uniqueKeys.size;
}

/**
 * Build weld log entries with component context
 *
 * @param welds - Field welds from database
 * @param components - Components for context
 * @returns Weld log entries with component identity and display names
 */
function buildWeldLog(
  welds: FieldWeldRow[],
  components: PackageComponent[]
): WeldLogEntry[] {
  return welds.map(weld => {
    // Find component for this weld
    const component = components.find(c => c.id === weld.component_id);

    // Extract weld display name from component identity_key
    const weld_display_name = extractWeldDisplayName(component);

    return {
      ...weld,
      component_identity_key: component?.identity_key || null,
      component_type: component?.component_type || 'field_weld',
      weld_display_name,
      welder_name: null, // TODO: Join with welders table if needed
    };
  });
}

/**
 * Extract weld display name from component identity_key
 *
 * @param component - Package component
 * @returns Formatted weld number (e.g., "W-001")
 */
function extractWeldDisplayName(component: PackageComponent | undefined): string {
  if (!component || !component.identity_key) return 'Unknown';

  const key = component.identity_key as any;
  if ('weld_number' in key) {
    return key.weld_number;
  }

  return component.identityDisplay || 'Unknown';
}

/**
 * Calculate NDE summary statistics for a set of welds
 *
 * @param welds - Weld log entries
 * @returns NDE summary with counts by result status
 */
function calculateNDESummary(welds: WeldLogEntry[]): NDESummary {
  const total_welds = welds.length;
  const nde_required_count = welds.filter(w => w.nde_required).length;
  const nde_pass_count = welds.filter(w => w.nde_result === 'PASS').length;
  const nde_fail_count = welds.filter(w => w.nde_result === 'FAIL').length;

  // Pending = nde_required AND (nde_result IS NULL OR nde_result = 'PENDING')
  const nde_pending_count = welds.filter(
    w => w.nde_required && (!w.nde_result || w.nde_result === 'PENDING')
  ).length;

  return {
    total_welds,
    nde_required_count,
    nde_pass_count,
    nde_fail_count,
    nde_pending_count,
  };
}

/**
 * Calculate component summary aggregated by type + identity across entire package
 * (excluding seq for supports to group similar items)
 *
 * @param components - All package components
 * @returns Component summary rows sorted by type + identity
 */
function calculateComponentSummary(components: PackageComponent[]): ComponentSummaryRow[] {
  // Group by canonical identity (excluding seq) across entire package
  const summaryMap = new Map<string, ComponentSummaryRow>();

  components.forEach(component => {
    // Build canonical key: type + identity_without_seq (no drawing)
    const identity_display = buildIdentityDisplay(component);
    const canonicalKey = `${component.component_type}|${identity_display}`;

    if (summaryMap.has(canonicalKey)) {
      // Increment quantity
      const existing = summaryMap.get(canonicalKey)!;
      existing.quantity += 1;
    } else {
      // Create new entry
      summaryMap.set(canonicalKey, {
        component_type: component.component_type || 'unknown',
        identity_display,
        quantity: 1,
      });
    }
  });

  // Convert to array and sort by component type then identity (immutable sort)
  const summary = [...Array.from(summaryMap.values())].sort((a, b) => {
    // Sort by component type first
    const typeCompare = a.component_type.localeCompare(b.component_type);
    if (typeCompare !== 0) return typeCompare;

    // Then by identity
    return a.identity_display.localeCompare(b.identity_display);
  });

  return summary;
}

/**
 * Calculate support summary aggregated by commodity_code + size
 *
 * @param components - All package components
 * @returns Support summary rows sorted by commodity_code + size
 */
function calculateSupportSummary(components: PackageComponent[]): SupportSummaryRow[] {
  // Filter for supports only
  const supports = components.filter(c => c.component_type === 'support');

  // Group by commodity_code + size (excluding seq)
  const summaryMap = new Map<string, SupportSummaryRow>();

  supports.forEach(support => {
    if (support.identity_key && typeof support.identity_key === 'object') {
      const key = support.identity_key as any;
      const commodity_code = key.commodity_code || 'Unknown';
      const size = key.size || 'Unknown';
      const canonicalKey = `${commodity_code}|${size}`;

      if (summaryMap.has(canonicalKey)) {
        // Increment quantity
        const existing = summaryMap.get(canonicalKey)!;
        existing.quantity += 1;
      } else {
        // Create new entry
        summaryMap.set(canonicalKey, {
          commodity_code,
          size,
          quantity: 1,
        });
      }
    }
  });

  // Convert to array and sort (immutable sort)
  const summary = [...Array.from(summaryMap.values())].sort((a, b) => {
    // Sort by commodity_code first
    const codeCompare = a.commodity_code.localeCompare(b.commodity_code);
    if (codeCompare !== 0) return codeCompare;

    // Then by size
    return a.size.localeCompare(b.size);
  });

  return summary;
}

/**
 * Build identity display string for component summary
 * Formats identity based on component type, excluding seq field
 *
 * @param component - Package component
 * @returns Formatted identity display string
 */
function buildIdentityDisplay(component: PackageComponent): string {
  if (!component.identity_key || typeof component.identity_key !== 'object') {
    return component.identityDisplay || 'Unknown';
  }

  const key = component.identity_key as any;

  switch (component.component_type) {
    case 'spool':
      // Format: "1-SPOOL-A"
      return `${key.line_no || ''}-SPOOL-${key.spool_no || ''}`;

    case 'support':
      // Format: "CS-2/2IN"
      return `${key.commodity_code || 'Unknown'}/${key.size || 'Unknown'}`;

    case 'valve':
      // Format: "V-100" (tag_no)
      return key.tag_no || key.commodity_code || 'Unknown';

    case 'field_weld':
      // Format: "W-001" (weld_number)
      return key.weld_number || 'Unknown';

    case 'fitting':
    case 'flange':
      // Format: commodity_code or tag
      return key.tag_no || key.commodity_code || 'Unknown';

    default:
      // Fallback: use identityDisplay or commodity_code
      return component.identityDisplay || key.commodity_code || 'Unknown';
  }
}

/**
 * Check if package workflow is draft (any incomplete stages)
 *
 * @param stages - Workflow stages from database
 * @returns true if any stage is not completed or skipped
 */
function checkIsDraft(stages: { stage_order: number; status: string }[]): boolean {
  if (stages.length === 0) return true; // No stages = draft

  // Check if all stages are completed or skipped
  const allComplete = stages.every(stage =>
    stage.status === 'completed' || stage.status === 'skipped'
  );

  return !allComplete; // Draft if any stage is not completed/skipped
}
