import Papa from 'papaparse'
import { readFileSync } from 'fs'
import { normalizeDrawing } from './src/lib/csv/normalize-drawing.js'
import { normalizeSize } from './src/lib/csv/normalize-size.js'
import { generateIdentityKey } from './src/lib/csv/generate-identity-key.js'

// Get CSV file path from command line
const csvFilePath = process.argv[2]
if (!csvFilePath) {
  console.error('Usage: node analyze_csv_duplicates.mjs <path-to-csv>')
  process.exit(1)
}

const csvContent = readFileSync(csvFilePath, 'utf-8')
const parsed = Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim()
})

console.log(`Analyzing CSV: ${csvFilePath}`)
console.log(`Total rows: ${parsed.data.length}\n`)

// Track identity keys and their row numbers
const identityKeyMap = new Map() // key -> array of row numbers

parsed.data.forEach((row, index) => {
  const rowNumber = index + 2 // +2 because row 1 is header, and we're 0-indexed

  const drawing = row.DRAWING || row.DRAWINGS
  const type = row.TYPE
  const size = row.SIZE || ''
  const cmdtyCode = row['CMDTY CODE'] || row['Cmdty Code'] || row['COMMODITY CODE']
  const qty = parseInt(row.QTY || row.QUANTITY || '1')

  if (!drawing || !type || !cmdtyCode) {
    return // Skip incomplete rows
  }

  const drawingNorm = normalizeDrawing(drawing)
  const sizeNorm = normalizeSize(size)

  // Generate first identity key (same logic as validator)
  const identityKey = generateIdentityKey(
    drawingNorm,
    size,
    cmdtyCode,
    1, // First instance
    qty,
    type
  )

  if (!identityKeyMap.has(identityKey)) {
    identityKeyMap.set(identityKey, [])
  }
  identityKeyMap.get(identityKey).push({ rowNumber, drawing, type, size, cmdtyCode, qty })
})

// Find duplicates
const duplicates = Array.from(identityKeyMap.entries())
  .filter(([_, rows]) => rows.length > 1)
  .sort((a, b) => a[1][0].rowNumber - b[1][0].rowNumber)

console.log(`Found ${duplicates.length} duplicate identity keys:\n`)

duplicates.forEach(([identityKey, rows]) => {
  console.log(`Identity Key: ${identityKey}`)
  console.log(`  Appears in ${rows.length} rows:`)
  rows.forEach(row => {
    console.log(`    Row ${row.rowNumber}: DRAWING="${row.drawing}", TYPE="${row.type}", SIZE="${row.size}", CMDTY="${row.cmdtyCode}", QTY=${row.qty}`)
  })
  console.log()
})

console.log('\nRecommendations:')
console.log('1. Consolidate duplicate rows by summing QTY values')
console.log('2. OR: Keep only one row and delete duplicates')
console.log('3. OR: If they represent different instances, ensure they have different DRAWING, SIZE, or CMDTY CODE values')
