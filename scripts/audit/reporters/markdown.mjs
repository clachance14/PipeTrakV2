/**
 * Markdown report generator for audit findings
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'

/**
 * Generate a markdown report from audit findings
 * @param {Object} params
 * @param {import('../lib/supabase-client.mjs').Finding[]} params.findings
 * @param {number} params.durationMs
 * @param {Object} params.stats
 * @param {string[]} params.checksRun
 * @returns {string} Markdown content
 */
export function generateMarkdownReport({ findings, durationMs, stats, checksRun }) {
  const timestamp = new Date().toISOString()
  const critical = findings.filter(f => f.severity === 'CRITICAL')
  const high = findings.filter(f => f.severity === 'HIGH')
  const medium = findings.filter(f => f.severity === 'MEDIUM')
  const low = findings.filter(f => f.severity === 'LOW')

  let md = `# Backend Audit Report

**Generated:** ${timestamp}
**Duration:** ${(durationMs / 1000).toFixed(2)}s
**Checks Run:** ${checksRun.join(', ')}

## Summary

| Severity | Count |
|----------|------:|
| CRITICAL | ${critical.length} |
| HIGH | ${high.length} |
| MEDIUM | ${medium.length} |
| LOW | ${low.length} |
| **Total** | **${findings.length}** |

`

  if (stats) {
    md += `## Statistics

| Metric | Value |
|--------|------:|
`
    for (const [key, value] of Object.entries(stats)) {
      md += `| ${formatStatKey(key)} | ${value} |\n`
    }
    md += '\n'
  }

  if (critical.length > 0) {
    md += `## CRITICAL Issues

${critical.map(f => formatFinding(f)).join('\n\n')}

`
  }

  if (high.length > 0) {
    md += `## HIGH Issues

${high.map(f => formatFinding(f)).join('\n\n')}

`
  }

  if (medium.length > 0) {
    md += `## MEDIUM Issues

${medium.map(f => formatFinding(f)).join('\n\n')}

`
  }

  if (low.length > 0) {
    md += `## LOW Issues

${low.map(f => formatFinding(f)).join('\n\n')}

`
  }

  if (findings.length === 0) {
    md += `## All Clear

No issues found. Database and code passed all audit checks.
`
  }

  return md
}

/**
 * Format a single finding as markdown
 * @param {import('../lib/supabase-client.mjs').Finding} f
 * @returns {string}
 */
function formatFinding(f) {
  const title = f.table ? `${f.table}${f.column ? '.' + f.column : ''}` : f.checkType

  let md = `### ${title}

- **Type:** \`${f.checkType}\`
- **Severity:** ${f.severity}
- **Count:** ${f.count}
`

  if (f.referencedTable) {
    md += `- **References:** ${f.referencedTable}\n`
  }

  if (f.location) {
    md += `- **Location:** \`${f.location.file}:${f.location.line}\`\n`
  }

  md += `
**Description:** ${f.description}

**Suggested Fix:** ${f.suggestedFix}
`

  if (f.samples && f.samples.length > 0) {
    md += `
<details>
<summary>Sample Records (${f.samples.length})</summary>

\`\`\`json
${JSON.stringify(f.samples, null, 2)}
\`\`\`
</details>
`
  }

  return md
}

/**
 * Format stat key for display
 * @param {string} key
 * @returns {string}
 */
function formatStatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .replace(/_/g, ' ')
}

/**
 * Save report to file
 * @param {string} content - Markdown content
 * @param {string} [outputDir] - Output directory (defaults to docs/audits)
 * @returns {string} Path to saved file
 */
export function saveReport(content, outputDir = 'docs/audits') {
  const date = new Date().toISOString().split('T')[0]
  const filename = `${date}-audit.md`
  const outputPath = resolve(process.cwd(), outputDir, filename)

  // Ensure directory exists
  const dir = dirname(outputPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(outputPath, content, 'utf-8')
  return outputPath
}

/**
 * Print summary to console
 * @param {import('../lib/supabase-client.mjs').Finding[]} findings
 * @param {number} durationMs
 */
export function printConsoleSummary(findings, durationMs) {
  const critical = findings.filter(f => f.severity === 'CRITICAL').length
  const high = findings.filter(f => f.severity === 'HIGH').length
  const medium = findings.filter(f => f.severity === 'MEDIUM').length
  const low = findings.filter(f => f.severity === 'LOW').length

  console.log('\n' + '='.repeat(60))
  console.log('AUDIT SUMMARY')
  console.log('='.repeat(60))
  console.log(`Duration: ${(durationMs / 1000).toFixed(2)}s`)
  console.log('')
  console.log(`  CRITICAL: ${critical}`)
  console.log(`  HIGH:     ${high}`)
  console.log(`  MEDIUM:   ${medium}`)
  console.log(`  LOW:      ${low}`)
  console.log(`  ─────────────`)
  console.log(`  Total:    ${findings.length}`)
  console.log('')

  if (critical > 0) {
    console.log('⛔ CRITICAL issues found - immediate attention required')
  } else if (high > 0) {
    console.log('⚠️  HIGH issues found - review recommended')
  } else if (findings.length > 0) {
    console.log('ℹ️  Some issues found - see report for details')
  } else {
    console.log('✅ All checks passed')
  }

  console.log('='.repeat(60) + '\n')
}
