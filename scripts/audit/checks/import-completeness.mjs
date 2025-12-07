/**
 * Import completeness check
 * Detects rows with NULL values in required business fields
 */
import { Severity, CheckType, createFinding } from '../lib/supabase-client.mjs'
import { REQUIRED_FIELDS } from '../config.mjs'

/**
 * Check for NULL values in required fields
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<import('../lib/supabase-client.mjs').Finding[]>}
 */
export async function checkImportCompleteness(supabase) {
  const findings = []
  console.log('  Checking import completeness...')

  for (const [table, requiredFields] of Object.entries(REQUIRED_FIELDS)) {
    for (const field of requiredFields) {
      try {
        const result = await checkField(supabase, table, field)
        if (result) {
          findings.push(result)
        }
      } catch (err) {
        console.log(`    ⚠️  Skipping ${table}.${field}: ${err.message}`)
      }
    }
  }

  console.log(`    Found ${findings.length} completeness issue(s)`)
  return findings
}

/**
 * Check a single field for NULL values
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} table
 * @param {string} field
 * @returns {Promise<import('../lib/supabase-client.mjs').Finding|null>}
 */
async function checkField(supabase, table, field) {
  const { count, data, error } = await supabase
    .from(table)
    .select('id, created_at', { count: 'exact', head: false })
    .is(field, null)
    .limit(5)

  if (error) {
    throw new Error(error.message)
  }

  if (!count || count === 0) {
    return null
  }

  return createFinding({
    checkType: CheckType.NULL_REQUIRED,
    severity: Severity.MEDIUM,
    table,
    column: field,
    count,
    samples: data?.map(s => ({
      id: s.id,
      created_at: s.created_at,
    })) || [],
    description: `${table}.${field} is NULL in ${count} row(s)`,
    suggestedFix: `-- Review import logic to ensure ${field} is populated:\n-- SELECT id, created_at FROM ${table} WHERE ${field} IS NULL LIMIT 10;`,
  })
}

/**
 * Run import completeness check only
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{findings: Finding[], stats: Object}>}
 */
export async function runImportCompletenessAudit(supabase) {
  const startTime = Date.now()
  const findings = await checkImportCompleteness(supabase)

  const totalFieldsChecked = Object.values(REQUIRED_FIELDS).reduce((sum, fields) => sum + fields.length, 0)

  return {
    findings,
    stats: {
      tablesChecked: Object.keys(REQUIRED_FIELDS).length,
      fieldsChecked: totalFieldsChecked,
      completenessIssues: findings.length,
      durationMs: Date.now() - startTime,
    },
  }
}
