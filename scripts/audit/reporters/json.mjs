/**
 * JSON reporter for CI integration
 */
import { writeFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Generate JSON report for CI consumption
 * @param {Object} params
 * @param {import('../lib/supabase-client.mjs').Finding[]} params.findings
 * @param {number} params.durationMs
 * @param {Object} params.stats
 * @param {string[]} params.checksRun
 * @returns {Object} JSON object
 */
export function generateJsonReport({ findings, durationMs, stats, checksRun }) {
  const critical = findings.filter(f => f.severity === 'CRITICAL')
  const high = findings.filter(f => f.severity === 'HIGH')
  const medium = findings.filter(f => f.severity === 'MEDIUM')
  const low = findings.filter(f => f.severity === 'LOW')

  // Determine exit code
  let exitCode = 0
  if (critical.length > 0) {
    exitCode = 1
  } else if (high.length > 0) {
    exitCode = 2
  }

  return {
    timestamp: new Date().toISOString(),
    durationMs,
    checksRun,
    stats,
    summary: {
      total: findings.length,
      critical: critical.length,
      high: high.length,
      medium: medium.length,
      low: low.length,
    },
    exitCode,
    findings: findings.map(f => ({
      checkType: f.checkType,
      severity: f.severity,
      table: f.table,
      column: f.column || null,
      referencedTable: f.referencedTable || null,
      count: f.count,
      description: f.description,
      suggestedFix: f.suggestedFix,
      location: f.location || null,
      // Omit samples in JSON output to keep it concise
    })),
  }
}

/**
 * Save JSON report to file
 * @param {Object} report - JSON report object
 * @param {string} [outputPath] - Output path
 * @returns {string} Path to saved file
 */
export function saveJsonReport(report, outputPath = 'audit-report.json') {
  const fullPath = resolve(process.cwd(), outputPath)
  writeFileSync(fullPath, JSON.stringify(report, null, 2), 'utf-8')
  return fullPath
}

/**
 * Print JSON to stdout (for CI piping)
 * @param {Object} report
 */
export function printJsonReport(report) {
  console.log(JSON.stringify(report, null, 2))
}
