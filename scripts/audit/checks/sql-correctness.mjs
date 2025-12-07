/**
 * SQL correctness checks
 * Detects NULL comparisons, type coercion issues, etc.
 */
import { readFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'
import { Severity, CheckType, createFinding } from '../lib/supabase-client.mjs'
import { CORRECTNESS_PATTERNS } from '../config.mjs'

/**
 * Check for SQL correctness issues
 * @returns {Promise<import('../lib/supabase-client.mjs').Finding[]>}
 */
export async function checkSqlCorrectness() {
  const findings = []
  console.log('  Checking SQL correctness...')

  try {
    const migrationsDir = resolve(process.cwd(), 'supabase/migrations')
    const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))

    for (const file of files) {
      const content = readFileSync(join(migrationsDir, file), 'utf-8')

      for (const pattern of CORRECTNESS_PATTERNS) {
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
            checkType: CheckType.NULL_COMPARISON,
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

    console.log(`    Found ${findings.length} correctness issue(s)`)
  } catch (err) {
    console.log(`    ⚠️  SQL correctness check failed: ${err.message}`)
  }

  return findings
}

/**
 * Run SQL correctness check only
 * @returns {Promise<{findings: Finding[], stats: Object}>}
 */
export async function runSqlCorrectnessAudit() {
  const startTime = Date.now()
  const findings = await checkSqlCorrectness()

  const migrationsDir = resolve(process.cwd(), 'supabase/migrations')
  const fileCount = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).length

  return {
    findings,
    stats: {
      migrationsScanned: fileCount,
      correctnessIssues: findings.length,
      durationMs: Date.now() - startTime,
    },
  }
}
