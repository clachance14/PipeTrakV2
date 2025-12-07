#!/usr/bin/env node
/**
 * Backend Audit Tool
 * Comprehensive audit of database integrity, type sync, and SQL quality
 *
 * Usage:
 *   node scripts/audit/index.mjs [options]
 *
 * Options:
 *   --check <type>     Run specific check: fk, types, sql, imports, all (default: all)
 *   --format <type>    Output format: console, json, markdown (default: console)
 *   --severity <level> Minimum severity: critical, high, medium, low (default: low)
 *   --output <path>    Output file path (for json/markdown formats)
 *   --help             Show this help message
 */
import { createAuditClient, Severity } from './lib/supabase-client.mjs'
import { checkOrphanedRecords } from './checks/orphaned-records.mjs'
import { checkImportCompleteness } from './checks/import-completeness.mjs'
import { checkTypeSync } from './checks/type-sync.mjs'
import { checkRpcDrift } from './checks/rpc-drift.mjs'
import { checkSqlSecurity } from './checks/sql-security.mjs'
import { checkSqlPerformance } from './checks/sql-performance.mjs'
import { checkSqlCorrectness } from './checks/sql-correctness.mjs'
import { generateMarkdownReport, saveReport, printConsoleSummary } from './reporters/markdown.mjs'
import { generateJsonReport, saveJsonReport, printJsonReport } from './reporters/json.mjs'

/**
 * Parse command line arguments
 * @returns {Object}
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    check: 'all',
    format: 'console',
    severity: 'low',
    output: null,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--check':
        options.check = args[++i] || 'all'
        break
      case '--format':
        options.format = args[++i] || 'console'
        break
      case '--severity':
        options.severity = args[++i] || 'low'
        break
      case '--output':
        options.output = args[++i]
        break
      case '--help':
      case '-h':
        options.help = true
        break
    }
  }

  return options
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Backend Audit Tool
==================

Usage:
  node scripts/audit/index.mjs [options]

Options:
  --check <type>     Run specific check(s):
                       fk       - Foreign key / orphaned records
                       types    - Type synchronization
                       sql      - SQL quality (security, performance, correctness)
                       imports  - Import completeness
                       all      - All checks (default)

  --format <type>    Output format:
                       console  - Terminal output (default)
                       json     - JSON output (for CI)
                       markdown - Markdown report

  --severity <level> Minimum severity to report:
                       critical, high, medium, low (default: low)

  --output <path>    Output file path (for json/markdown formats)
                       Default: docs/audits/YYYY-MM-DD-audit.md

  --help, -h         Show this help message

Examples:
  # Full audit with console output
  node scripts/audit/index.mjs

  # FK check only, JSON output for CI
  node scripts/audit/index.mjs --check fk --format json

  # SQL security check, save markdown report
  node scripts/audit/index.mjs --check sql --format markdown

  # Show only HIGH+ issues
  node scripts/audit/index.mjs --severity high
`)
}

/**
 * Filter findings by severity
 * @param {import('./lib/supabase-client.mjs').Finding[]} findings
 * @param {string} minSeverity
 * @returns {import('./lib/supabase-client.mjs').Finding[]}
 */
function filterBySeverity(findings, minSeverity) {
  const severityOrder = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  }

  const minLevel = severityOrder[minSeverity.toLowerCase()] ?? 3

  return findings.filter(f => {
    const level = severityOrder[f.severity.toLowerCase()] ?? 3
    return level <= minLevel
  })
}

/**
 * Run the audit
 */
async function main() {
  const options = parseArgs()

  if (options.help) {
    printHelp()
    process.exit(0)
  }

  console.log('='.repeat(60))
  console.log('BACKEND AUDIT')
  console.log('='.repeat(60))
  console.log(`Check: ${options.check}`)
  console.log(`Format: ${options.format}`)
  console.log(`Min Severity: ${options.severity}`)
  console.log('='.repeat(60) + '\n')

  const startTime = Date.now()
  const allFindings = []
  const checksRun = []
  const stats = {}

  try {
    // Initialize Supabase client for live DB checks
    let supabase = null
    const needsDb = ['all', 'fk', 'imports'].includes(options.check)

    if (needsDb) {
      try {
        supabase = createAuditClient()
        console.log('Connected to Supabase\n')
      } catch (err) {
        console.log(`⚠️  Database connection failed: ${err.message}`)
        console.log('Skipping live database checks\n')
      }
    }

    // Run requested checks
    console.log('Running checks...\n')

    if (['all', 'fk'].includes(options.check) && supabase) {
      checksRun.push('orphaned-records')
      const findings = await checkOrphanedRecords(supabase)
      allFindings.push(...findings)
      stats.orphanedRecordIssues = findings.length
    }

    if (['all', 'imports'].includes(options.check) && supabase) {
      checksRun.push('import-completeness')
      const findings = await checkImportCompleteness(supabase)
      allFindings.push(...findings)
      stats.importCompletenessIssues = findings.length
    }

    if (['all', 'types'].includes(options.check)) {
      checksRun.push('type-sync')
      const findings = await checkTypeSync()
      allFindings.push(...findings)
      stats.typeSyncIssues = findings.length

      checksRun.push('rpc-drift')
      const rpcFindings = await checkRpcDrift()
      allFindings.push(...rpcFindings)
      stats.rpcDriftIssues = rpcFindings.length
    }

    if (['all', 'sql'].includes(options.check)) {
      checksRun.push('sql-security')
      const securityFindings = await checkSqlSecurity()
      allFindings.push(...securityFindings)
      stats.securityIssues = securityFindings.length

      checksRun.push('sql-performance')
      const perfFindings = await checkSqlPerformance()
      allFindings.push(...perfFindings)
      stats.performanceIssues = perfFindings.length

      checksRun.push('sql-correctness')
      const correctFindings = await checkSqlCorrectness()
      allFindings.push(...correctFindings)
      stats.correctnessIssues = correctFindings.length
    }

    const durationMs = Date.now() - startTime

    // Filter by severity
    const filteredFindings = filterBySeverity(allFindings, options.severity)

    // Generate output
    switch (options.format) {
      case 'json': {
        const report = generateJsonReport({
          findings: filteredFindings,
          durationMs,
          stats,
          checksRun,
        })

        if (options.output) {
          const path = saveJsonReport(report, options.output)
          console.log(`\nReport saved to: ${path}`)
        } else {
          printJsonReport(report)
        }

        process.exit(report.exitCode)
        break
      }

      case 'markdown': {
        const report = generateMarkdownReport({
          findings: filteredFindings,
          durationMs,
          stats,
          checksRun,
        })

        const path = saveReport(report, options.output || 'docs/audits')
        console.log(`\nReport saved to: ${path}`)
        printConsoleSummary(filteredFindings, durationMs)
        break
      }

      default: {
        // Console output
        printConsoleSummary(filteredFindings, durationMs)

        if (filteredFindings.length > 0) {
          console.log('\nTop Issues:\n')
          const topIssues = filteredFindings
            .sort((a, b) => {
              const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
              return (order[a.severity] || 3) - (order[b.severity] || 3)
            })
            .slice(0, 10)

          for (const f of topIssues) {
            console.log(`  [${f.severity}] ${f.table}${f.column ? '.' + f.column : ''}`)
            console.log(`    ${f.description}`)
            if (f.location) {
              console.log(`    Location: ${f.location.file}:${f.location.line}`)
            }
            console.log('')
          }

          if (filteredFindings.length > 10) {
            console.log(`  ... and ${filteredFindings.length - 10} more issues`)
          }
        }
      }
    }

    // Determine exit code
    const criticalCount = filteredFindings.filter(f => f.severity === 'CRITICAL').length
    const highCount = filteredFindings.filter(f => f.severity === 'HIGH').length

    if (criticalCount > 0) {
      process.exit(1)
    } else if (highCount > 0) {
      process.exit(2)
    } else {
      process.exit(0)
    }
  } catch (err) {
    console.error('\n❌ Audit failed:', err.message)
    console.error(err.stack)
    process.exit(3)
  }
}

main()
