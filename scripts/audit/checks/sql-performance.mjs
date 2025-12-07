/**
 * SQL performance checks
 * Detects missing indexes, SELECT *, and other performance anti-patterns
 */
import { readFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'
import { Severity, CheckType, createFinding } from '../lib/supabase-client.mjs'
import { parseAllMigrations } from '../lib/schema-parser.mjs'
import { FOREIGN_KEYS, PERFORMANCE_PATTERNS } from '../config.mjs'

/**
 * FK columns that typically don't benefit from indexes:
 * - Audit/tracking columns (rarely queried by)
 * - User reference columns (low-value joins)
 */
const LOW_VALUE_FK_COLUMNS = new Set([
  'created_by',
  'last_updated_by',
  'updated_by',
  'verified_by',
  'resolved_by',
  'completed_by',
  'approved_by',
  'assigned_to',
  'modified_by',
])

/**
 * Check for SQL performance issues
 * @returns {Promise<import('../lib/supabase-client.mjs').Finding[]>}
 */
export async function checkSqlPerformance() {
  const findings = []
  console.log('  Checking SQL performance...')

  try {
    // Check for missing FK indexes
    const indexFindings = checkFkIndexes()
    findings.push(...indexFindings)

    // Check for performance anti-patterns
    const patternFindings = checkPerformancePatterns()
    findings.push(...patternFindings)

    console.log(`    Found ${findings.length} performance issue(s)`)
  } catch (err) {
    console.log(`    ⚠️  SQL performance check failed: ${err.message}`)
  }

  return findings
}

/**
 * Check that FK columns have indexes
 * @returns {import('../lib/supabase-client.mjs').Finding[]}
 */
function checkFkIndexes() {
  const findings = []
  const schema = parseAllMigrations()

  for (const fk of FOREIGN_KEYS) {
    // Skip low-value audit/tracking columns (rarely queried by)
    if (LOW_VALUE_FK_COLUMNS.has(fk.childColumn)) {
      continue
    }

    // Check if there's an index on the FK column (including composite indexes)
    const hasIndex = Array.from(schema.indexes.values()).some(idx =>
      idx.tableName === fk.childTable &&
      idx.columns.includes(fk.childColumn)
    )

    // Also check if it's a primary key (which is automatically indexed)
    const isPrimaryKey = fk.childColumn === 'id'

    if (!hasIndex && !isPrimaryKey) {
      findings.push(createFinding({
        checkType: CheckType.MISSING_INDEX,
        severity: Severity.HIGH,
        table: fk.childTable,
        column: fk.childColumn,
        referencedTable: fk.parentTable,
        count: 1,
        description: `Foreign key column '${fk.childTable}.${fk.childColumn}' lacks an index`,
        suggestedFix: `CREATE INDEX idx_${fk.childTable}_${fk.childColumn} ON ${fk.childTable}(${fk.childColumn});`,
      }))
    }
  }

  return findings
}

/**
 * Check for performance anti-patterns in migrations
 * @returns {import('../lib/supabase-client.mjs').Finding[]}
 */
function checkPerformancePatterns() {
  const findings = []
  const migrationsDir = resolve(process.cwd(), 'supabase/migrations')

  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))

  for (const file of files) {
    const content = readFileSync(join(migrationsDir, file), 'utf-8')

    for (const pattern of PERFORMANCE_PATTERNS) {
      if (!pattern.pattern) continue

      let match
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags)

      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length

        // Skip if in a comment
        const lineStart = content.lastIndexOf('\n', match.index) + 1
        const lineEnd = content.indexOf('\n', match.index)
        const line = content.substring(lineStart, lineEnd === -1 ? undefined : lineEnd)

        if (line.trim().startsWith('--')) continue

        findings.push(createFinding({
          checkType: 'performance_pattern',
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
 * Run SQL performance check only
 * @returns {Promise<{findings: Finding[], stats: Object}>}
 */
export async function runSqlPerformanceAudit() {
  const startTime = Date.now()
  const findings = await checkSqlPerformance()

  return {
    findings,
    stats: {
      fkRelationshipsChecked: FOREIGN_KEYS.length,
      performanceIssues: findings.length,
      durationMs: Date.now() - startTime,
    },
  }
}
