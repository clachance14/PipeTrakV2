/**
 * Audit configuration
 * Contains FK relationships extracted from migrations and required field definitions
 */

/**
 * Foreign key relationships extracted from supabase/migrations/
 * Used for orphaned record detection
 *
 * @typedef {Object} ForeignKeyDef
 * @property {string} childTable - Table containing the FK
 * @property {string} childColumn - Column name of the FK
 * @property {string} parentTable - Referenced table
 * @property {string} parentColumn - Referenced column (usually 'id')
 * @property {string|null} onDelete - CASCADE | SET NULL | RESTRICT | null
 * @property {boolean} isRequired - Whether the FK column is NOT NULL
 */

/** @type {ForeignKeyDef[]} */
export const FOREIGN_KEYS = [
  // =====================
  // users table
  // =====================
  { childTable: 'users', childColumn: 'organization_id', parentTable: 'organizations', parentColumn: 'id', onDelete: 'RESTRICT', isRequired: false },

  // =====================
  // projects table
  // =====================
  { childTable: 'projects', childColumn: 'organization_id', parentTable: 'organizations', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },

  // =====================
  // invitations table
  // =====================
  { childTable: 'invitations', childColumn: 'organization_id', parentTable: 'organizations', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },

  // =====================
  // drawings table
  // =====================
  { childTable: 'drawings', childColumn: 'project_id', parentTable: 'projects', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },
  { childTable: 'drawings', childColumn: 'area_id', parentTable: 'areas', parentColumn: 'id', onDelete: 'SET NULL', isRequired: false },
  { childTable: 'drawings', childColumn: 'system_id', parentTable: 'systems', parentColumn: 'id', onDelete: 'SET NULL', isRequired: false },
  { childTable: 'drawings', childColumn: 'test_package_id', parentTable: 'test_packages', parentColumn: 'id', onDelete: 'SET NULL', isRequired: false },

  // =====================
  // components table
  // =====================
  { childTable: 'components', childColumn: 'project_id', parentTable: 'projects', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },
  { childTable: 'components', childColumn: 'drawing_id', parentTable: 'drawings', parentColumn: 'id', onDelete: 'SET NULL', isRequired: false },
  { childTable: 'components', childColumn: 'progress_template_id', parentTable: 'progress_templates', parentColumn: 'id', onDelete: 'RESTRICT', isRequired: true },
  { childTable: 'components', childColumn: 'area_id', parentTable: 'areas', parentColumn: 'id', onDelete: 'SET NULL', isRequired: false },
  { childTable: 'components', childColumn: 'system_id', parentTable: 'systems', parentColumn: 'id', onDelete: 'SET NULL', isRequired: false },
  { childTable: 'components', childColumn: 'test_package_id', parentTable: 'test_packages', parentColumn: 'id', onDelete: 'SET NULL', isRequired: false },
  { childTable: 'components', childColumn: 'created_by', parentTable: 'users', parentColumn: 'id', onDelete: null, isRequired: false },
  { childTable: 'components', childColumn: 'last_updated_by', parentTable: 'users', parentColumn: 'id', onDelete: null, isRequired: false },

  // =====================
  // milestone_events table
  // =====================
  { childTable: 'milestone_events', childColumn: 'component_id', parentTable: 'components', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },
  { childTable: 'milestone_events', childColumn: 'user_id', parentTable: 'users', parentColumn: 'id', onDelete: null, isRequired: true },

  // =====================
  // areas table
  // =====================
  { childTable: 'areas', childColumn: 'project_id', parentTable: 'projects', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },

  // =====================
  // systems table
  // =====================
  { childTable: 'systems', childColumn: 'project_id', parentTable: 'projects', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },

  // =====================
  // test_packages table
  // =====================
  { childTable: 'test_packages', childColumn: 'project_id', parentTable: 'projects', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },

  // =====================
  // welders table
  // =====================
  { childTable: 'welders', childColumn: 'project_id', parentTable: 'projects', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },
  { childTable: 'welders', childColumn: 'created_by', parentTable: 'users', parentColumn: 'id', onDelete: null, isRequired: false },
  { childTable: 'welders', childColumn: 'verified_by', parentTable: 'users', parentColumn: 'id', onDelete: null, isRequired: false },

  // =====================
  // field_welds table
  // =====================
  { childTable: 'field_welds', childColumn: 'component_id', parentTable: 'components', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },
  { childTable: 'field_welds', childColumn: 'project_id', parentTable: 'projects', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },
  { childTable: 'field_welds', childColumn: 'welder_id', parentTable: 'welders', parentColumn: 'id', onDelete: 'SET NULL', isRequired: false },
  { childTable: 'field_welds', childColumn: 'original_weld_id', parentTable: 'field_welds', parentColumn: 'id', onDelete: 'SET NULL', isRequired: false },
  { childTable: 'field_welds', childColumn: 'created_by', parentTable: 'users', parentColumn: 'id', onDelete: null, isRequired: true },

  // =====================
  // needs_review table
  // =====================
  { childTable: 'needs_review', childColumn: 'project_id', parentTable: 'projects', parentColumn: 'id', onDelete: null, isRequired: true },
  { childTable: 'needs_review', childColumn: 'component_id', parentTable: 'components', parentColumn: 'id', onDelete: null, isRequired: false },
  { childTable: 'needs_review', childColumn: 'created_by', parentTable: 'users', parentColumn: 'id', onDelete: null, isRequired: false },
  { childTable: 'needs_review', childColumn: 'resolved_by', parentTable: 'users', parentColumn: 'id', onDelete: null, isRequired: false },

  // =====================
  // audit_log table
  // =====================
  { childTable: 'audit_log', childColumn: 'project_id', parentTable: 'projects', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },
  { childTable: 'audit_log', childColumn: 'user_id', parentTable: 'users', parentColumn: 'id', onDelete: null, isRequired: true },

  // =====================
  // report_configs table
  // =====================
  { childTable: 'report_configs', childColumn: 'project_id', parentTable: 'projects', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },
  { childTable: 'report_configs', childColumn: 'created_by', parentTable: 'users', parentColumn: 'id', onDelete: 'SET NULL', isRequired: false },

  // =====================
  // project_progress_templates table
  // =====================
  { childTable: 'project_progress_templates', childColumn: 'project_id', parentTable: 'projects', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },

  // =====================
  // project_template_changes table
  // =====================
  { childTable: 'project_template_changes', childColumn: 'project_id', parentTable: 'projects', parentColumn: 'id', onDelete: null, isRequired: true },
  { childTable: 'project_template_changes', childColumn: 'changed_by', parentTable: 'users', parentColumn: 'id', onDelete: 'SET NULL', isRequired: false },

  // =====================
  // package_certificates table
  // =====================
  { childTable: 'package_certificates', childColumn: 'package_id', parentTable: 'test_packages', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },

  // =====================
  // package_drawing_assignments table
  // =====================
  { childTable: 'package_drawing_assignments', childColumn: 'package_id', parentTable: 'test_packages', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },
  { childTable: 'package_drawing_assignments', childColumn: 'drawing_id', parentTable: 'drawings', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },

  // =====================
  // package_component_assignments table
  // =====================
  { childTable: 'package_component_assignments', childColumn: 'package_id', parentTable: 'test_packages', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },
  { childTable: 'package_component_assignments', childColumn: 'component_id', parentTable: 'components', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },

  // =====================
  // package_workflow_stages table
  // =====================
  { childTable: 'package_workflow_stages', childColumn: 'package_id', parentTable: 'test_packages', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },
  { childTable: 'package_workflow_stages', childColumn: 'completed_by', parentTable: 'users', parentColumn: 'id', onDelete: null, isRequired: false },

  // =====================
  // field_weld_report_snapshots table
  // =====================
  { childTable: 'field_weld_report_snapshots', childColumn: 'project_id', parentTable: 'projects', parentColumn: 'id', onDelete: 'CASCADE', isRequired: true },
]

/**
 * Required business fields per table
 * Used for import completeness checking
 * These are fields that should never be NULL based on business logic,
 * even if the database allows NULL
 */
export const REQUIRED_FIELDS = {
  components: [
    'project_id',
    'component_type',
    'progress_template_id',
    'identity_key',
  ],
  field_welds: [
    'component_id',
    'project_id',
    'weld_type',
    'created_by',
  ],
  drawings: [
    'project_id',
    'drawing_no_raw',
    'drawing_no_norm',
  ],
  welders: [
    'project_id',
    'name',
    'stencil',
    'stencil_norm',
  ],
  milestone_events: [
    'component_id',
    'user_id',
    'milestone_name',
    'action',
  ],
  areas: [
    'project_id',
    'name',
  ],
  systems: [
    'project_id',
    'name',
  ],
  test_packages: [
    'project_id',
    'name',
    'test_type',
  ],
}

/**
 * Tables that MUST have RLS enabled
 * All tables in public schema should have RLS, but these are critical
 */
export const CRITICAL_RLS_TABLES = [
  'organizations',
  'users',
  'projects',
  'invitations',
  'components',
  'drawings',
  'milestone_events',
  'field_welds',
  'welders',
  'areas',
  'systems',
  'test_packages',
  'audit_log',
  'report_configs',
  'needs_review',
]

/**
 * SQL patterns to detect for security issues
 */
export const SECURITY_PATTERNS = [
  {
    id: 'SEC001',
    name: 'SQL Injection Risk',
    pattern: /EXECUTE\s+['"].*\$\{/gi,
    severity: 'CRITICAL',
    description: 'String interpolation in EXECUTE statement - potential SQL injection',
    recommendation: 'Use parameterized queries with EXECUTE ... USING',
  },
  {
    id: 'SEC002',
    name: 'SECURITY DEFINER without auth check',
    // This needs context-aware checking, handled separately
    severity: 'HIGH',
    description: 'SECURITY DEFINER function may lack permission check',
    recommendation: 'Add explicit permission check using auth.uid() or get_user_org_role()',
  },
]

/**
 * SQL patterns to detect for performance issues
 */
export const PERFORMANCE_PATTERNS = [
  {
    id: 'PERF001',
    name: 'SELECT * usage',
    pattern: /SELECT\s+\*\s+FROM/gi,
    severity: 'LOW',
    description: 'SELECT * may fetch unnecessary columns',
    recommendation: 'Explicitly list required columns',
  },
]

/**
 * SQL patterns to detect for correctness issues
 */
export const CORRECTNESS_PATTERNS = [
  {
    id: 'CORR001',
    name: 'NULL comparison with =',
    pattern: /WHERE[^;]*[^!<>]=\s*NULL/gi,
    severity: 'HIGH',
    description: 'Using = NULL instead of IS NULL (always false)',
    recommendation: 'Use IS NULL or IS NOT NULL for NULL comparisons',
  },
  {
    id: 'CORR002',
    name: 'NOT = NULL',
    pattern: /WHERE[^;]*!=\s*NULL/gi,
    severity: 'HIGH',
    description: 'Using != NULL instead of IS NOT NULL (always false)',
    recommendation: 'Use IS NOT NULL for NULL comparisons',
  },
]
