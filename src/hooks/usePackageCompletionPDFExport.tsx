/**
 * usePackageCompletionPDFExport Hook
 * Feature 030: Test Package Workflow - PDF export for completion reports
 *
 * Lazy-loading PDF export hook for package completion/turnover reports.
 * Manages PDF generation lifecycle with loading states and error handling.
 *
 * Key Features:
 * - Lazy loads @react-pdf/renderer (700KB-1.2MB) only when needed
 * - Prevents multiple simultaneous exports
 * - Handles browser download triggering and permission errors
 * - Provides loading and error states for UI feedback
 * - Automatically cleans up object URLs
 * - Formats for 8.5 x 11 inch (US Letter) paper
 * - Supports configurable detail level (summary vs full weld log)
 * - Unified data fetch for consistency at export time
 *
 * @example
 * ```tsx
 * function PackageCompletionReportPage() {
 *   const { generatePDFWithOptions, isGenerating, error } = usePackageCompletionPDFExport();
 *
 *   const handleExport = async () => {
 *     try {
 *       await generatePDFWithOptions(
 *         packageId,
 *         projectId,
 *         'Project Name',
 *         { includeWeldDetails: true },
 *         companyLogo // optional
 *       );
 *       toast.success('PDF downloaded successfully');
 *     } catch (err) {
 *       toast.error('Failed to generate PDF');
 *     }
 *   };
 *
 *   return (
 *     <Button onClick={handleExport} disabled={isGenerating}>
 *       {isGenerating ? 'Generating...' : 'Export PDF'}
 *     </Button>
 *   );
 * }
 * ```
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSizeWithInches } from '@/lib/formatComponentIdentity';
import type { PackageCompletionReport } from '@/types/packageReport';
import type { PackageWorkflowStage } from '@/types/workflow.types';

/**
 * Format identity_key JSONB to human-readable string for PDF display
 * Uses inch notation for sizes and excludes seq for proper aggregation
 */
function formatIdentityKey(identityKey: unknown): string {
  if (!identityKey) return '';
  if (typeof identityKey === 'string') return identityKey;
  if (typeof identityKey !== 'object') return String(identityKey);

  const obj = identityKey as Record<string, unknown>;

  // Extract tag (commodity_code, tag_no, or weld_number)
  const tag = obj.tag_no || obj.commodity_code || obj.weld_number;
  const size = obj.size ? formatSizeWithInches(String(obj.size)) : null;

  // For field welds: just weld_number
  if (obj.weld_number) {
    return String(obj.weld_number);
  }

  // For components with tag/commodity_code
  if (tag) {
    if (size) {
      return `${tag} | ${size}`;
    }
    return String(tag);
  }

  // For welds with pipe_id: {pipe_id}
  if (obj.pipe_id) {
    return `Pipe: ${obj.pipe_id}`;
  }

  // Fallback: Join values (excluding seq and drawing_norm)
  const excludeKeys = ['seq', 'drawing_norm'];
  const values = Object.entries(obj)
    .filter(([key, val]) => val && !excludeKeys.includes(key))
    .map(([, val]) => String(val));

  if (values.length > 0) {
    return values.join(' | ');
  }

  return JSON.stringify(obj);
}

/**
 * Get the most common value from an array of strings
 * Returns null if array is empty
 */
function getMostCommonValue(values: string[]): string | null {
  if (values.length === 0) return null;

  const counts = new Map<string, number>();
  values.forEach((v) => {
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
 * Export options for PDF generation
 */
export interface PackageExportOptions {
  /** Include full weld log details (default: false, shows summary only) */
  includeWeldDetails: boolean;
}

/**
 * Extended report data with workflow
 */
export interface PackageCompletionExportData {
  reportData: PackageCompletionReport;
  workflowStages: PackageWorkflowStage[];
  options: PackageExportOptions;
}

interface UsePackageCompletionPDFExportReturn {
  /** Legacy: Generate PDF with pre-fetched data */
  generatePDF: (
    data: PackageCompletionReport,
    projectName: string,
    companyLogo?: string
  ) => Promise<Blob>;
  /** Legacy: Generate PDF preview with pre-fetched data */
  generatePDFPreview: (
    data: PackageCompletionReport,
    projectName: string,
    companyLogo?: string
  ) => Promise<{ blob: Blob; url: string; filename: string }>;
  /** NEW: Generate PDF with unified data fetch and options */
  generatePDFWithOptions: (
    packageId: string,
    projectId: string,
    projectName: string,
    options: PackageExportOptions,
    companyLogo?: string
  ) => Promise<Blob>;
  /** NEW: Generate PDF preview with unified data fetch and options */
  generatePDFPreviewWithOptions: (
    packageId: string,
    projectId: string,
    projectName: string,
    options: PackageExportOptions,
    companyLogo?: string
  ) => Promise<{ blob: Blob; url: string; filename: string }>;
  /** NEW: Fetch all export data (for validation before export) */
  fetchExportData: (
    packageId: string
  ) => Promise<Omit<PackageCompletionExportData, 'options'>>;
  isGenerating: boolean;
  error: Error | null;
}

/**
 * Fetch workflow stages with user info
 */
async function fetchWorkflowStages(packageId: string): Promise<PackageWorkflowStage[]> {
  const { data, error } = await supabase
    .from('package_workflow_stages')
    .select(
      `
      *,
      completed_by_user:users!completed_by(id, full_name, email)
    `
    )
    .eq('package_id', packageId)
    .order('stage_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch workflow stages: ${error.message}`);
  }

  return (data as PackageWorkflowStage[]) || [];
}

/**
 * Fetch report data (components, welds, etc.)
 * Mirrors usePackageCompletionReport logic but as a direct fetch
 */
async function fetchReportData(
  packageId: string
): Promise<PackageCompletionReport> {
  // Fetch package details
  const { data: packageData, error: packageError } = await supabase
    .from('test_packages')
    .select('id, name, test_type, target_date, test_pressure, test_pressure_unit')
    .eq('id', packageId)
    .single();

  if (packageError) {
    throw new Error(`Failed to fetch package: ${packageError.message}`);
  }

  // Fetch components with drawing info
  const { data: componentsData, error: componentsError } = await supabase
    .from('components')
    .select(
      `
      id,
      identity_key,
      component_type,
      drawing_id,
      drawings!inner(id, drawing_no_norm)
    `
    )
    .eq('test_package_id', packageId)
    .eq('is_retired', false);

  if (componentsError) {
    throw new Error(`Failed to fetch components: ${componentsError.message}`);
  }

  const components = componentsData || [];

  // Fetch field welds for all components
  const componentIds = components.map((c) => c.id);
  let welds: any[] = [];

  if (componentIds.length > 0) {
    const { data: weldsData, error: weldsError } = await supabase
      .from('field_welds')
      .select(
        `
        *,
        components!inner(id, identity_key, component_type),
        welders(id, name, stencil)
      `
      )
      .in('component_id', componentIds);

    if (weldsError) {
      throw new Error(`Failed to fetch welds: ${weldsError.message}`);
    }

    welds = weldsData || [];
  }

  // Fetch workflow stages to determine draft status
  const workflowStages = await fetchWorkflowStages(packageId);
  const isDraft = !workflowStages.every(
    (s) => s.status === 'completed' || s.status === 'skipped'
  );

  // Group components by drawing
  const drawingGroupsMap = new Map<
    string,
    {
      drawing_id: string;
      drawing_no_norm: string;
      components: any[];
      welds: any[];
    }
  >();

  for (const component of components) {
    const drawingId = component.drawing_id;
    // Skip components without drawings
    if (!drawingId) continue;

    const drawingNoNorm = (component.drawings as any)?.drawing_no_norm || 'Unknown';

    if (!drawingGroupsMap.has(drawingId)) {
      drawingGroupsMap.set(drawingId, {
        drawing_id: drawingId,
        drawing_no_norm: drawingNoNorm,
        components: [],
        welds: [],
      });
    }

    // Format identity_key as string for PDF rendering
    drawingGroupsMap.get(drawingId)!.components.push({
      ...component,
      identity_key: formatIdentityKey(component.identity_key),
    });
  }

  // Add welds to their drawing groups
  for (const weld of welds) {
    const component = components.find((c) => c.id === weld.component_id);
    if (component && component.drawing_id) {
      const group = drawingGroupsMap.get(component.drawing_id);
      if (group) {
        group.welds.push({
          ...weld,
          component_identity_key: formatIdentityKey(component.identity_key),
          component_type: component.component_type,
          weld_display_name: weld.weld_number || weld.id.slice(0, 8),
          welder_name: weld.welders?.name || null,
        });
      }
    }
  }

  // Build drawing groups with NDE summaries
  const drawingGroups = Array.from(drawingGroupsMap.values()).map((group) => {
    const ndeRequired = group.welds.filter((w) => w.nde_required);
    const ndePass = ndeRequired.filter((w) => w.nde_result === 'PASS');
    const ndeFail = ndeRequired.filter((w) => w.nde_result === 'FAIL');
    const ndePending = ndeRequired.filter(
      (w) => !w.nde_result || w.nde_result === 'PENDING'
    );

    const supportComponents = group.components.filter(
      (c) => c.component_type === 'support'
    );
    // identity_key is already formatted as string in this context
    const uniqueSupports = new Set(supportComponents.map((c) => String(c.identity_key)));

    // Calculate most common NPD (weld_size) and piping spec for this drawing
    const weldSizes = group.welds.map((w) => w.weld_size).filter(Boolean) as string[];
    const specs = group.welds.map((w) => w.spec).filter(Boolean) as string[];
    const npd = getMostCommonValue(weldSizes);
    const piping_spec = getMostCommonValue(specs);

    return {
      drawing_id: group.drawing_id,
      drawing_no_norm: group.drawing_no_norm,
      npd,
      piping_spec,
      component_count: group.components.length,
      unique_supports_count: uniqueSupports.size,
      components: group.components,
      weld_log: group.welds,
      nde_summary: {
        total_welds: group.welds.length,
        nde_required_count: ndeRequired.length,
        nde_pass_count: ndePass.length,
        nde_fail_count: ndeFail.length,
        nde_pending_count: ndePending.length,
      },
    };
  });

  // Build component summary (aggregated by identity across entire package)
  const componentSummaryMap = new Map<string, any>();
  for (const component of components) {
    if (component.component_type === 'support') continue;

    // Use stringified identity_key for grouping (package-level, not drawing-level)
    const identityStr = formatIdentityKey(component.identity_key);
    const key = `${component.component_type}|${identityStr}`;
    if (!componentSummaryMap.has(key)) {
      componentSummaryMap.set(key, {
        component_type: component.component_type,
        identity_display: identityStr,
        quantity: 0,
      });
    }
    componentSummaryMap.get(key)!.quantity++;
  }

  // Build support summary (extract commodity_code and size from identity_key JSONB)
  const supportSummaryMap = new Map<string, any>();
  for (const component of components) {
    if (component.component_type !== 'support') continue;

    // identity_key is a JSONB field containing commodity_code and size for supports
    const identityKey = component.identity_key as any;
    const commodityCode = identityKey?.commodity_code || 'N/A';
    const size = identityKey?.size || 'N/A';

    const key = `${commodityCode}|${size}`;
    if (!supportSummaryMap.has(key)) {
      supportSummaryMap.set(key, {
        commodity_code: commodityCode,
        size: size,
        quantity: 0,
      });
    }
    supportSummaryMap.get(key)!.quantity++;
  }

  // Calculate overall NDE summary
  const allWelds = welds;
  const allNdeRequired = allWelds.filter((w) => w.nde_required);
  const allNdePass = allNdeRequired.filter((w) => w.nde_result === 'PASS');
  const allNdeFail = allNdeRequired.filter((w) => w.nde_result === 'FAIL');
  const allNdePending = allNdeRequired.filter(
    (w) => !w.nde_result || w.nde_result === 'PENDING'
  );

  const allSupports = components.filter((c) => c.component_type === 'support');
  // Format identity_key to string for unique count
  const uniqueSupportsTotal = new Set(allSupports.map((c) => formatIdentityKey(c.identity_key)));

  // Calculate package-level piping spec (most common across all welds)
  const allSpecs = welds.map((w) => w.spec).filter(Boolean) as string[];
  const packagePipingSpec = getMostCommonValue(allSpecs);

  return {
    package_id: packageId,
    package_name: packageData.name,
    test_type: packageData.test_type,
    target_date: packageData.target_date,
    test_pressure: packageData.test_pressure,
    test_pressure_unit: packageData.test_pressure_unit,
    piping_spec: packagePipingSpec,
    component_summary: Array.from(componentSummaryMap.values()),
    support_summary: Array.from(supportSummaryMap.values()),
    is_draft: isDraft,
    drawing_groups: drawingGroups,
    total_components: components.length,
    total_unique_supports: uniqueSupportsTotal.size,
    overall_nde_summary: {
      total_welds: allWelds.length,
      nde_required_count: allNdeRequired.length,
      nde_pass_count: allNdePass.length,
      nde_fail_count: allNdeFail.length,
      nde_pending_count: allNdePending.length,
    },
  };
}

/**
 * usePackageCompletionPDFExport Hook
 *
 * @returns {UsePackageCompletionPDFExportReturn} Hook return object
 */
export function usePackageCompletionPDFExport(): UsePackageCompletionPDFExportReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Generate PDF filename for package completion report
   */
  const generateFilename = (packageName: string, date: Date): string => {
    const timestamp = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const sanitizedName = packageName.replace(/[^a-zA-Z0-9-]/g, '_');
    return `Package_Completion_Report_${sanitizedName}_${timestamp}.pdf`;
  };

  /**
   * Fetch all export data for a package
   */
  const fetchExportData = async (
    packageId: string
  ): Promise<Omit<PackageCompletionExportData, 'options'>> => {
    // Parallel fetch for consistency
    const [reportData, workflowStages] = await Promise.all([
      fetchReportData(packageId),
      fetchWorkflowStages(packageId),
    ]);

    // Validate draft status consistency (workflow is source of truth)
    const workflowComplete = workflowStages.every(
      (s) => s.status === 'completed' || s.status === 'skipped'
    );
    const isDraft = !workflowComplete;

    // Use workflow as source of truth for draft status
    const finalReportData = { ...reportData, is_draft: isDraft };

    return {
      reportData: finalReportData,
      workflowStages,
    };
  };

  /**
   * Generate PDF blob with extended data
   */
  const generatePDFBlobWithOptions = async (
    exportData: PackageCompletionExportData,
    projectName: string,
    companyLogo?: string
  ): Promise<{ blob: Blob; filename: string }> => {
    // Lazy load @react-pdf/renderer
    const { pdf } = await import('@react-pdf/renderer');
    const { PackageCompletionReportPDF } = await import(
      '@/components/pdf/reports/PackageCompletionReportPDF'
    );

    const generatedDate = new Date().toISOString().split('T')[0] ?? '';

    const blob = await pdf(
      <PackageCompletionReportPDF
        reportData={exportData.reportData}
        projectName={projectName}
        generatedDate={generatedDate}
        companyLogo={companyLogo}
        workflowStages={exportData.workflowStages}
        includeWeldDetails={exportData.options.includeWeldDetails}
      />
    ).toBlob();

    const filename = generateFilename(exportData.reportData.package_name, new Date());

    return { blob, filename };
  };

  /**
   * Generate PDF blob (legacy - without extended data)
   */
  const generatePDFBlob = async (
    data: PackageCompletionReport,
    projectName: string,
    companyLogo?: string
  ): Promise<{ blob: Blob; filename: string }> => {
    const { pdf } = await import('@react-pdf/renderer');
    const { PackageCompletionReportPDF } = await import(
      '@/components/pdf/reports/PackageCompletionReportPDF'
    );

    const generatedDate = new Date().toISOString().split('T')[0] ?? '';

    const blob = await pdf(
      <PackageCompletionReportPDF
        reportData={data}
        projectName={projectName}
        generatedDate={generatedDate}
        companyLogo={companyLogo}
      />
    ).toBlob();

    const filename = generateFilename(data.package_name, new Date());

    return { blob, filename };
  };

  /**
   * NEW: Generate PDF with unified fetch and options
   */
  const generatePDFWithOptions = async (
    packageId: string,
    _projectId: string,
    projectName: string,
    options: PackageExportOptions,
    companyLogo?: string
  ): Promise<Blob> => {
    if (isGenerating) {
      throw new Error('PDF generation already in progress');
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Fetch all data at export time for consistency
      const exportData = await fetchExportData(packageId);

      // Generate PDF with all data
      const { blob, filename } = await generatePDFBlobWithOptions(
        { ...exportData, options },
        projectName,
        companyLogo
      );

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      try {
        link.click();
      } catch (downloadError) {
        URL.revokeObjectURL(url);
        throw new Error(
          'Failed to download PDF. Please check your browser settings and allow downloads for this site.'
        );
      }

      URL.revokeObjectURL(url);
      return blob;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error during PDF generation');
      setError(error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * NEW: Generate PDF preview with unified fetch and options
   */
  const generatePDFPreviewWithOptions = async (
    packageId: string,
    _projectId: string,
    projectName: string,
    options: PackageExportOptions,
    companyLogo?: string
  ): Promise<{ blob: Blob; url: string; filename: string }> => {
    if (isGenerating) {
      throw new Error('PDF generation already in progress');
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Fetch all data at export time for consistency
      const exportData = await fetchExportData(packageId);

      // Generate PDF with all data
      const { blob, filename } = await generatePDFBlobWithOptions(
        { ...exportData, options },
        projectName,
        companyLogo
      );

      const url = URL.createObjectURL(blob);

      return { blob, url, filename };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error during PDF generation');
      setError(error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Legacy: Generate PDF preview with pre-fetched data
   */
  const generatePDFPreview = async (
    data: PackageCompletionReport,
    projectName: string,
    companyLogo?: string
  ): Promise<{ blob: Blob; url: string; filename: string }> => {
    if (isGenerating) {
      throw new Error('PDF generation already in progress');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { blob, filename } = await generatePDFBlob(data, projectName, companyLogo);
      const url = URL.createObjectURL(blob);

      return { blob, url, filename };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error during PDF generation');
      setError(error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Legacy: Generate and download PDF with pre-fetched data
   */
  const generatePDF = async (
    data: PackageCompletionReport,
    projectName: string,
    companyLogo?: string
  ): Promise<Blob> => {
    if (isGenerating) {
      throw new Error('PDF generation already in progress');
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { blob, filename } = await generatePDFBlob(data, projectName, companyLogo);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      try {
        link.click();
      } catch (downloadError) {
        URL.revokeObjectURL(url);
        throw new Error(
          'Failed to download PDF. Please check your browser settings and allow downloads for this site.'
        );
      }

      URL.revokeObjectURL(url);
      return blob;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error during PDF generation');
      setError(error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generatePDF,
    generatePDFPreview,
    generatePDFWithOptions,
    generatePDFPreviewWithOptions,
    fetchExportData,
    isGenerating,
    error,
  };
}
