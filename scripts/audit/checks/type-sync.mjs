/**
 * Type sync check
 * Compares database.types.ts against migrations to detect staleness
 */
import { Severity, CheckType, createFinding } from '../lib/supabase-client.mjs'
import { parseAllMigrations, getNewestMigration } from '../lib/schema-parser.mjs'
import { parseGeneratedTypes, getTypesModTime, typesMatch } from '../lib/types-parser.mjs'

/**
 * SQL keywords and internal names that should be skipped as table names
 */
const SKIP_TABLE_NAMES = new Set([
  // SQL keywords
  'with', 'as', 'select', 'from', 'where', 'join', 'on', 'and', 'or', 'not',
  'insert', 'update', 'delete', 'create', 'alter', 'drop', 'table', 'view',
  'index', 'constraint', 'primary', 'foreign', 'key', 'references',
  // CTE names and aliases
  'recursive', 'cte', 'temp', 'tmp',
])

/**
 * Check for type synchronization issues
 * @returns {Promise<import('../lib/supabase-client.mjs').Finding[]>}
 */
export async function checkTypeSync() {
  const findings = []
  console.log('  Checking type synchronization...')

  try {
    // Check staleness first
    const stalenessResult = checkStaleness()
    if (stalenessResult) {
      findings.push(stalenessResult)
    }

    // Parse both schema sources
    const schema = parseAllMigrations()
    const types = parseGeneratedTypes()

    // Check for missing tables
    for (const [tableName, tableDef] of schema.tables) {
      // Skip SQL keywords that may have been incorrectly parsed as table names
      if (SKIP_TABLE_NAMES.has(tableName.toLowerCase())) {
        continue
      }
      if (!types.tables.has(tableName)) {
        findings.push(createFinding({
          checkType: CheckType.TYPE_MISMATCH,
          severity: Severity.CRITICAL,
          table: tableName,
          count: 1,
          description: `Table '${tableName}' exists in migrations but missing from database.types.ts`,
          suggestedFix: 'Run: supabase gen types typescript --linked > src/types/database.types.ts',
          location: {
            file: tableDef.migrationFile,
            line: tableDef.lineNumber,
          },
        }))
      }
    }

    // Check for extra tables in types (may indicate deleted table)
    for (const [tableName] of types.tables) {
      if (!schema.tables.has(tableName)) {
        findings.push(createFinding({
          checkType: CheckType.TYPE_MISMATCH,
          severity: Severity.MEDIUM,
          table: tableName,
          count: 1,
          description: `Table '${tableName}' in database.types.ts but not found in migrations (may be dropped)`,
          suggestedFix: 'Regenerate types or verify table was intentionally dropped',
        }))
      }
    }

    // Check for column mismatches
    for (const [tableName, tableDef] of schema.tables) {
      const typesTable = types.tables.get(tableName)
      if (!typesTable) continue

      // Check for missing columns
      for (const [colName, colDef] of tableDef.columns) {
        if (!typesTable.columns.has(colName)) {
          findings.push(createFinding({
            checkType: CheckType.TYPE_MISMATCH,
            severity: Severity.HIGH,
            table: tableName,
            column: colName,
            count: 1,
            description: `Column '${tableName}.${colName}' (${colDef.type}) exists in migrations but missing from types`,
            suggestedFix: 'Run: supabase gen types typescript --linked > src/types/database.types.ts',
            location: {
              file: tableDef.migrationFile,
              line: tableDef.lineNumber,
            },
          }))
        }
      }
    }

    console.log(`    Found ${findings.length} type sync issue(s)`)
  } catch (err) {
    console.log(`    ⚠️  Type sync check failed: ${err.message}`)
  }

  return findings
}

/**
 * Check if types file is stale compared to migrations
 * @returns {import('../lib/supabase-client.mjs').Finding|null}
 */
function checkStaleness() {
  const typesMtime = getTypesModTime()
  const newestMigration = getNewestMigration()

  if (typesMtime < newestMigration.mtime) {
    const daysDiff = Math.round((newestMigration.mtime - typesMtime) / (1000 * 60 * 60 * 24))

    return createFinding({
      checkType: CheckType.TYPE_STALE,
      severity: Severity.HIGH,
      table: 'database.types.ts',
      count: 1,
      description: `Types file is ${daysDiff} day(s) older than newest migration (${newestMigration.file})`,
      suggestedFix: 'Run: supabase gen types typescript --linked > src/types/database.types.ts',
      location: {
        file: newestMigration.file,
        line: 1,
      },
    })
  }

  return null
}

/**
 * Run type sync check only
 * @returns {Promise<{findings: Finding[], stats: Object}>}
 */
export async function runTypeSyncAudit() {
  const startTime = Date.now()
  const findings = await checkTypeSync()

  const schema = parseAllMigrations()
  const types = parseGeneratedTypes()

  return {
    findings,
    stats: {
      migrationsAnalyzed: schema.tables.size,
      tablesInTypes: types.tables.size,
      typeSyncIssues: findings.length,
      durationMs: Date.now() - startTime,
    },
  }
}
