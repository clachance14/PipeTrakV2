/**
 * SQL security checks
 * Detects missing RLS, SECURITY DEFINER issues, SQL injection patterns
 */
import { readFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'
import { Severity, CheckType, createFinding } from '../lib/supabase-client.mjs'
import { parseAllMigrations } from '../lib/schema-parser.mjs'
import { CRITICAL_RLS_TABLES, SECURITY_PATTERNS } from '../config.mjs'

/**
 * Check for SQL security issues
 * @returns {Promise<import('../lib/supabase-client.mjs').Finding[]>}
 */
export async function checkSqlSecurity() {
  const findings = []
  console.log('  Checking SQL security...')

  try {
    // Check RLS coverage
    const rlsFindings = checkRlsCoverage()
    findings.push(...rlsFindings)

    // Check SECURITY DEFINER functions
    const definerFindings = checkSecurityDefiner()
    findings.push(...definerFindings)

    // Check for SQL injection patterns
    const injectionFindings = checkInjectionPatterns()
    findings.push(...injectionFindings)

    console.log(`    Found ${findings.length} security issue(s)`)
  } catch (err) {
    console.log(`    ⚠️  SQL security check failed: ${err.message}`)
  }

  return findings
}

/**
 * Check that all critical tables have RLS enabled
 * @returns {import('../lib/supabase-client.mjs').Finding[]}
 */
function checkRlsCoverage() {
  const findings = []
  const schema = parseAllMigrations()

  for (const tableName of CRITICAL_RLS_TABLES) {
    const table = schema.tables.get(tableName)

    if (!table) {
      // Table doesn't exist - might be expected
      continue
    }

    if (!schema.rlsEnabledTables.has(tableName)) {
      findings.push(createFinding({
        checkType: CheckType.MISSING_RLS,
        severity: Severity.CRITICAL,
        table: tableName,
        count: 1,
        description: `Table '${tableName}' does not have Row Level Security enabled`,
        suggestedFix: `Add migration: ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`,
        location: {
          file: table.migrationFile,
          line: table.lineNumber,
        },
      }))
    }
  }

  return findings
}

/**
 * Functions that ARE permission checks - they don't need another permission check inside them
 * These functions are designed to be called to verify permissions
 */
const PERMISSION_CHECK_FUNCTIONS = new Set([
  'get_user_org_role',
  'user_is_org_member',
  'check_email_has_organization',
  'user_is_admin',
  'user_is_pm',
  'user_is_member',
  'check_user_permission',
  'verify_user_access',
])

/**
 * Trigger functions - called automatically by PostgreSQL, not by users
 * These run in response to INSERT/UPDATE/DELETE on tables
 */
const TRIGGER_FUNCTION_PATTERNS = [
  /^auto_/,           // auto_clone_templates_on_project_create
  /^refresh_/,        // refresh_package_readiness_on_component_change
  /^update_/,         // update_timestamp_trigger
  /^on_/,             // on_auth_user_created
  /^handle_/,         // handle_new_user
  /^trigger_/,        // trigger_set_timestamp
  /_trigger$/,        // set_updated_at_trigger
  /_on_change$/,      // refresh_mv_on_change
]

/**
 * Internal utility functions - called by other SECURITY DEFINER functions, not directly by users
 * These perform internal operations and inherit authorization from their callers
 */
const INTERNAL_UTILITY_PATTERNS = [
  /^recalculate_/,    // recalculate_components_with_template (called by update_project_template_weights)
  /^calculate_/,      // calculate_component_percent (pure calculation)
  /^build_/,          // build_response_object (helper)
  /^validate_/,       // validate_input (helper)
  /^generate_/,       // generate_report_data (helper)
  /^aggregate_/,      // aggregate_component_stats (helper)
  /^upsert_aggregate/, // upsert_aggregate_* (internal upsert helpers)
]

/**
 * Check if function is an internal utility (called by other functions)
 * @param {string} funcName
 * @returns {boolean}
 */
function isInternalUtilityFunction(funcName) {
  return INTERNAL_UTILITY_PATTERNS.some(pattern => pattern.test(funcName))
}

/**
 * Check if function is a trigger function
 * @param {string} funcName
 * @returns {boolean}
 */
function isTriggerFunction(funcName) {
  return TRIGGER_FUNCTION_PATTERNS.some(pattern => pattern.test(funcName))
}

/**
 * Check SECURITY DEFINER functions for proper permission checks
 * @returns {import('../lib/supabase-client.mjs').Finding[]}
 */
function checkSecurityDefiner() {
  const findings = []
  const schema = parseAllMigrations()

  for (const [funcName, funcDef] of schema.functions) {
    if (!funcDef.securityDefiner) continue

    // Skip functions that ARE permission checks
    if (PERMISSION_CHECK_FUNCTIONS.has(funcName)) {
      continue
    }

    // Skip trigger functions (they're called by PostgreSQL, not users)
    if (isTriggerFunction(funcName)) {
      continue
    }

    // Skip internal utility functions (called by other SECURITY DEFINER functions)
    if (isInternalUtilityFunction(funcName)) {
      continue
    }

    // Check if function body contains permission check
    const hasPermissionCheck =
      /auth\.uid\(\)/i.test(funcDef.body) ||
      /get_user_org_role/i.test(funcDef.body) ||
      /user_is_org_member/i.test(funcDef.body) ||
      /current_user/i.test(funcDef.body) ||
      /session_user/i.test(funcDef.body) ||
      /check_.*permission/i.test(funcDef.body)

    // Check if it's a read-only function (less risky)
    const isReadOnly =
      (!/INSERT|UPDATE|DELETE/i.test(funcDef.body)) ||
      /RETURNS\s+(?:TABLE|SETOF|record|trigger)/i.test(funcDef.returnType)

    // Check if it returns trigger (trigger functions are handled differently)
    const returnsTrigger = /RETURNS\s+trigger/i.test(funcDef.returnType)

    if (!hasPermissionCheck && !isReadOnly && !returnsTrigger) {
      findings.push(createFinding({
        checkType: CheckType.SECURITY_DEFINER,
        severity: Severity.HIGH,
        table: funcName,
        count: 1,
        description: `SECURITY DEFINER function '${funcName}' may lack permission check`,
        suggestedFix: `Add permission check using auth.uid() at the start of function body`,
        location: {
          file: funcDef.migrationFile,
          line: funcDef.lineNumber,
        },
      }))
    }
  }

  return findings
}

/**
 * Check for SQL injection patterns in migrations
 * @returns {import('../lib/supabase-client.mjs').Finding[]}
 */
function checkInjectionPatterns() {
  const findings = []
  const migrationsDir = resolve(process.cwd(), 'supabase/migrations')

  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))

  for (const file of files) {
    const content = readFileSync(join(migrationsDir, file), 'utf-8')

    for (const pattern of SECURITY_PATTERNS) {
      if (!pattern.pattern) continue

      let match
      while ((match = pattern.pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length

        findings.push(createFinding({
          checkType: CheckType.SQL_INJECTION,
          severity: pattern.severity,
          table: file,
          count: 1,
          description: `${pattern.name}: ${pattern.description}`,
          suggestedFix: pattern.recommendation,
          location: {
            file: `supabase/migrations/${file}`,
            line: lineNumber,
          },
        }))
      }
    }
  }

  return findings
}

/**
 * Run SQL security check only
 * @returns {Promise<{findings: Finding[], stats: Object}>}
 */
export async function runSqlSecurityAudit() {
  const startTime = Date.now()
  const findings = await checkSqlSecurity()

  const schema = parseAllMigrations()

  return {
    findings,
    stats: {
      tablesChecked: CRITICAL_RLS_TABLES.length,
      functionsChecked: schema.functions.size,
      securityIssues: findings.length,
      durationMs: Date.now() - startTime,
    },
  }
}
