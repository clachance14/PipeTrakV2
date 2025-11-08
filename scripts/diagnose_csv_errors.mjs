import Papa from 'papaparse'
import { readFileSync } from 'fs'

const csvFilePath = process.argv[2]
if (!csvFilePath) {
  console.error('Usage: node diagnose_csv_errors.mjs <path-to-csv>')
  process.exit(1)
}

const csvContent = readFileSync(csvFilePath, 'utf-8')
const lines = csvContent.split('\n')

console.log(`Analyzing CSV: ${csvFilePath}`)
console.log(`Total lines: ${lines.length}\n`)

// Parse with Papa Parse to get errors
const parsed = Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: false, // Don't skip to see empty lines
  transformHeader: (h) => h.trim()
})

console.log('=== PAPA PARSE ERRORS ===\n')
if (parsed.errors && parsed.errors.length > 0) {
  parsed.errors.forEach(error => {
    console.log(`Row ${error.row + 2}: ${error.message}`)
    console.log(`  Type: ${error.type}`)
    if (error.code) console.log(`  Code: ${error.code}`)
    console.log()
  })
} else {
  console.log('No Papa Parse errors detected.\n')
}

// Manual inspection of problem rows
const problemRows = [8, 350, 351, 352]

console.log('=== INSPECTING PROBLEM ROWS ===\n')

// Get header to know expected field count
const headerLine = lines[0]
const headerFields = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''))
console.log(`Header (Row 1): ${headerFields.length} fields`)
console.log(`  ${headerFields.join(' | ')}\n`)

problemRows.forEach(rowNum => {
  const lineIndex = rowNum - 1 // Convert to 0-indexed
  if (lineIndex >= lines.length) {
    console.log(`Row ${rowNum}: OUT OF BOUNDS (file only has ${lines.length} lines)\n`)
    return
  }

  const line = lines[lineIndex]

  // Count commas (naive field count)
  const commaCount = (line.match(/,/g) || []).length
  const estimatedFields = commaCount + 1

  console.log(`Row ${rowNum}:`)
  console.log(`  Comma count: ${commaCount}`)
  console.log(`  Estimated fields: ${estimatedFields} (expected: ${headerFields.length})`)
  console.log(`  Raw line (first 200 chars): "${line.substring(0, 200)}..."`)

  // Try to parse just this row
  const singleRowParse = Papa.parse(line, {
    header: false,
    skipEmptyLines: false
  })

  if (singleRowParse.data && singleRowParse.data[0]) {
    const fields = singleRowParse.data[0]
    console.log(`  Parsed fields: ${fields.length}`)
    console.log(`  Field values:`)
    fields.forEach((field, idx) => {
      const preview = field.length > 50 ? field.substring(0, 50) + '...' : field
      console.log(`    [${idx}]: "${preview}"`)
    })
  }

  if (singleRowParse.errors && singleRowParse.errors.length > 0) {
    console.log(`  Parse errors:`)
    singleRowParse.errors.forEach(err => {
      console.log(`    - ${err.message}`)
    })
  }

  console.log()
})

console.log('=== COMMON FIXES ===')
console.log('1. Too many fields: Usually caused by unescaped comma in a field')
console.log('   Fix: Wrap the field in double quotes, e.g., "Description, with comma"')
console.log()
console.log('2. Too few fields: Usually caused by:')
console.log('   - Missing commas (forgot a column)')
console.log('   - Line break in the middle of a quoted field')
console.log('   - Excel export issues')
console.log('   Fix: Ensure each row has exactly ' + headerFields.length + ' fields')
console.log()
console.log('3. Empty rows: Delete completely blank lines')
console.log()
console.log('TIP: Open CSV in a text editor (not Excel) to see raw commas and quotes')
