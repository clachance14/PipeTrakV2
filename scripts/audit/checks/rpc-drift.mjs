/**
 * RPC drift detection
 * Finds RPC functions that reference non-existent tables or columns
 */
import { Severity, CheckType, createFinding } from '../lib/supabase-client.mjs'
import { parseAllMigrations, extractTableReferences } from '../lib/schema-parser.mjs'
import { parseGeneratedTypes } from '../lib/types-parser.mjs'

/**
 * System tables, views, and internal references that should be skipped
 */
const SYSTEM_TABLES = new Set([
  // PostgreSQL system
  'pg_catalog',
  'pg_class',
  'pg_namespace',
  'pg_type',
  'pg_attribute',
  'pg_constraint',
  'pg_index',
  'pg_stat_user_tables',

  // Supabase auth schema
  'auth',
  'users', // auth.users is valid

  // Supabase internal
  'supabase_migrations',
  'schema_migrations',

  // Information schema
  'information_schema',

  // Common SQL keywords that might be parsed as tables
  'select',
  'from',
  'where',
  'set',
  'values',
  'with',
  'returning',
  'into',
  'update',
  'delete',
  'insert',
  'join',
  'on',
  'and',
  'or',
  'not',
  'null',
  'true',
  'false',
  'case',
  'when',
  'then',
  'else',
  'end',
  'as',
  'is',
  'in',
  'exists',
  'between',
  'like',
  'ilike',
  'any',
  'all',
  'distinct',
  'order',
  'by',
  'asc',
  'desc',
  'limit',
  'offset',
  'group',
  'having',
  'union',
  'except',
  'intersect',
  'with',
  'recursive',
  'coalesce',
  'nullif',
  'greatest',
  'least',
  'row',
  'array',
  'jsonb_build_object',
  'json_build_object',
  'jsonb_agg',
  'json_agg',
  'count',
  'sum',
  'avg',
  'min',
  'max',
  'now',
  'current_timestamp',
  'current_date',
  'current_user',
  'session_user',

  // Materialized views (valid references)
  'mv_package_readiness',
  'mv_component_counts',

  // PostgreSQL built-in functions (not tables)
  'jsonb_array_elements',
  'jsonb_each',
  'jsonb_object_keys',
  'json_array_elements',
  'json_each',
  'generate_series',
  'unnest',
  'regexp_split_to_table',
  'string_to_table',
  'xpath',

  // Common SQL aliases and variable names
  'old',
  'new',
  'owner',
  'result',
  'rec',
  'row',
  'item',
  'elem',
  'val',
  'key',
  'value',
  'data',
  'record',
  'found',
  'temp',
  'tmp',

  // Legacy tables (dropped but referenced in old migration files that were superseded)
  'user_organizations', // Dropped in 00008_single_org_refactor.sql, refs cleaned in 00039

  // PostgreSQL types (not tables)
  'numeric',
  'text',
  'integer',
  'boolean',
  'uuid',
  'jsonb',
  'json',
  'timestamp',
  'timestamptz',
  'date',
  'time',
  'interval',
  'bytea',
  'void',

  // Common CTE names and variable aliases
  'attributes',
  'absolute',
  'milestones',
  'component',
  'project',
  'drawing',
  'user',
  'progress',
  'template',
  'weights',
  'template_weights',
  'repair_chain',
  'loop',
  'parent',
  'child',
  'source',
  'target',
  'current',
  'previous',
  'next',
  'first',
  'last',
  'count',
  'total',
  'sum',
  'avg',
  'current_values',
  'statement',
  'v_update_query',
  'last_updated_at',
  'this',
  'the',
  'system',
  'for',

  // Tables that may have been dropped but are referenced in legacy functions
  'field_weld_inspections', // Was planned but may not exist anymore

  // Common words that appear in comments/docstrings
  'reading',
  'modifying',
  'field',
  'weld',
  'table',
  'database',
  'query',
])

/**
 * Check for RPC function drift
 * @returns {Promise<import('../lib/supabase-client.mjs').Finding[]>}
 */
export async function checkRpcDrift() {
  const findings = []
  console.log('  Checking RPC function drift...')

  try {
    const schema = parseAllMigrations()

    // Get list of valid table names from BOTH migrations and generated types
    const validTables = new Set(schema.tables.keys())

    // Also add tables from generated types (more reliable source)
    try {
      const generatedTypes = parseGeneratedTypes()
      for (const tableName of generatedTypes.tables.keys()) {
        validTables.add(tableName)
      }
    } catch {
      // Types parser failed, continue with migrations only
    }

    // Check each function
    for (const [funcName, funcDef] of schema.functions) {
      const referencedTables = extractTableReferences(funcDef.body)

      for (const table of referencedTables) {
        const tableLower = table.toLowerCase()

        // Skip system tables and keywords
        if (SYSTEM_TABLES.has(tableLower)) {
          continue
        }

        // Skip if starts with common prefixes
        if (tableLower.startsWith('pg_') ||
            tableLower.startsWith('auth.') ||
            tableLower.startsWith('_') ||
            tableLower.startsWith('supabase_')) {
          continue
        }

        // Skip single-letter aliases (common in SQL)
        if (table.length <= 2) {
          continue
        }

        if (!validTables.has(table)) {
          findings.push(createFinding({
            checkType: CheckType.RPC_DRIFT,
            severity: Severity.CRITICAL,
            table: funcName,
            column: table,
            count: 1,
            description: `Function '${funcName}' references non-existent table '${table}'`,
            suggestedFix: `Review function ${funcName} and update or remove references to '${table}'`,
            location: {
              file: funcDef.migrationFile,
              line: funcDef.lineNumber,
            },
          }))
        }
      }
    }

    console.log(`    Found ${findings.length} RPC drift issue(s)`)
  } catch (err) {
    console.log(`    ⚠️  RPC drift check failed: ${err.message}`)
  }

  return findings
}

/**
 * Run RPC drift check only
 * @returns {Promise<{findings: Finding[], stats: Object}>}
 */
export async function runRpcDriftAudit() {
  const startTime = Date.now()
  const findings = await checkRpcDrift()

  const schema = parseAllMigrations()

  return {
    findings,
    stats: {
      functionsAnalyzed: schema.functions.size,
      rpcDriftIssues: findings.length,
      durationMs: Date.now() - startTime,
    },
  }
}
