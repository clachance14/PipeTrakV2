/**
 * Orphaned records detection
 * Finds FK references pointing to deleted/non-existent parent records
 */
import { Severity, CheckType, createFinding } from '../lib/supabase-client.mjs'
import { FOREIGN_KEYS } from '../config.mjs'

/**
 * Check for orphaned records across all FK relationships
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<import('../lib/supabase-client.mjs').Finding[]>}
 */
export async function checkOrphanedRecords(supabase) {
  const findings = []
  console.log('  Checking for orphaned records...')

  // Filter to non-CASCADE FKs (CASCADE handles cleanup automatically)
  const fksToCheck = FOREIGN_KEYS.filter(fk => fk.onDelete !== 'CASCADE')

  for (const fk of fksToCheck) {
    try {
      const result = await checkSingleFk(supabase, fk)
      if (result) {
        findings.push(result)
      }
    } catch (err) {
      console.log(`    ⚠️  Skipping ${fk.childTable}.${fk.childColumn}: ${err.message}`)
    }
  }

  console.log(`    Found ${findings.length} orphaned record issue(s)`)
  return findings
}

/**
 * Check a single FK relationship for orphaned records
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {import('../config.mjs').ForeignKeyDef} fk
 * @returns {Promise<import('../lib/supabase-client.mjs').Finding|null>}
 */
async function checkSingleFk(supabase, fk) {
  // Step 1: Get all FK values from child table (that are not null)
  const { data: childRefs, error: childError } = await supabase
    .from(fk.childTable)
    .select(fk.childColumn)
    .not(fk.childColumn, 'is', null)

  if (childError) {
    throw new Error(`Child query failed: ${childError.message}`)
  }

  if (!childRefs || childRefs.length === 0) {
    return null // No FK values to check
  }

  // Step 2: Get all parent IDs
  const { data: parentIds, error: parentError } = await supabase
    .from(fk.parentTable)
    .select(fk.parentColumn)

  if (parentError) {
    throw new Error(`Parent query failed: ${parentError.message}`)
  }

  // Build a set of valid parent IDs
  const parentSet = new Set(parentIds?.map(p => p[fk.parentColumn]) || [])

  // Step 3: Find orphaned references
  const orphanedValues = [...new Set(
    childRefs
      .filter(c => !parentSet.has(c[fk.childColumn]))
      .map(c => c[fk.childColumn])
  )]

  if (orphanedValues.length === 0) {
    return null
  }

  // Step 4: Get sample records for the report
  const { data: samples } = await supabase
    .from(fk.childTable)
    .select('id, created_at')
    .in(fk.childColumn, orphanedValues.slice(0, 10))
    .limit(5)

  const severity = fk.isRequired ? Severity.CRITICAL : Severity.HIGH

  // Generate safe fix suggestion
  const suggestedFix = fk.onDelete === 'SET NULL'
    ? `UPDATE ${fk.childTable} SET ${fk.childColumn} = NULL WHERE ${fk.childColumn} IN (SELECT id FROM missing_${fk.parentTable});`
    : `-- Review these records manually before taking action:\n-- SELECT * FROM ${fk.childTable} WHERE ${fk.childColumn} NOT IN (SELECT ${fk.parentColumn} FROM ${fk.parentTable});`

  return createFinding({
    checkType: CheckType.ORPHANED_RECORD,
    severity,
    table: fk.childTable,
    column: fk.childColumn,
    referencedTable: fk.parentTable,
    count: orphanedValues.length,
    samples: samples?.map(s => ({
      id: s.id,
      created_at: s.created_at,
    })) || [],
    description: `${fk.childTable}.${fk.childColumn} references ${orphanedValues.length} non-existent ${fk.parentTable} record(s)`,
    suggestedFix,
  })
}

/**
 * Run orphaned records check only
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{findings: Finding[], stats: Object}>}
 */
export async function runOrphanedRecordsAudit(supabase) {
  const startTime = Date.now()
  const findings = await checkOrphanedRecords(supabase)

  return {
    findings,
    stats: {
      fkRelationshipsChecked: FOREIGN_KEYS.filter(fk => fk.onDelete !== 'CASCADE').length,
      orphanedIssues: findings.length,
      durationMs: Date.now() - startTime,
    },
  }
}
