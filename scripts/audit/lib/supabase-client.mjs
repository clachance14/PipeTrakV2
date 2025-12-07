/**
 * Supabase client for audit scripts
 * Uses service role key to bypass RLS for comprehensive data access
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

/**
 * Initialize Supabase client with service role key
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createAuditClient() {
  const envPath = resolve(process.cwd(), '.env')

  if (!existsSync(envPath)) {
    throw new Error('Missing .env file. Run from project root.')
  }

  const envContent = readFileSync(envPath, 'utf-8')
  let supabaseUrl = ''
  let supabaseServiceKey = ''

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim()
    }
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim()
    }
  })

  if (!supabaseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL in .env')
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

/**
 * Severity levels for findings
 */
export const Severity = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
}

/**
 * Check types
 */
export const CheckType = {
  ORPHANED_RECORD: 'orphaned_record',
  NULL_REQUIRED: 'null_required',
  TYPE_STALE: 'type_stale',
  TYPE_MISMATCH: 'type_mismatch',
  RPC_DRIFT: 'rpc_drift',
  MISSING_RLS: 'missing_rls',
  SECURITY_DEFINER: 'security_definer',
  SQL_INJECTION: 'sql_injection',
  MISSING_INDEX: 'missing_index',
  NULL_COMPARISON: 'null_comparison',
  FK_GAP: 'fk_gap',
}

/**
 * @typedef {Object} Finding
 * @property {string} checkType - Type of check that produced this finding
 * @property {string} severity - Severity level
 * @property {string} table - Affected table name
 * @property {string} [column] - Affected column (if applicable)
 * @property {string} [referencedTable] - Parent table (for FK issues)
 * @property {number} count - Number of affected rows/instances
 * @property {Object[]} [samples] - Sample records (max 5)
 * @property {string} description - Human-readable description
 * @property {string} suggestedFix - Recommended action (production-safe)
 * @property {Object} [location] - File and line number (for static analysis)
 */

/**
 * Create a finding object
 * @param {Partial<Finding>} props
 * @returns {Finding}
 */
export function createFinding(props) {
  return {
    checkType: props.checkType || 'unknown',
    severity: props.severity || Severity.MEDIUM,
    table: props.table || '',
    column: props.column,
    referencedTable: props.referencedTable,
    count: props.count || 0,
    samples: props.samples || [],
    description: props.description || '',
    suggestedFix: props.suggestedFix || '',
    location: props.location,
  }
}
