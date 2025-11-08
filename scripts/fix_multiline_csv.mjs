import { readFileSync, writeFileSync } from 'fs'

const inputFile = process.argv[2]
const outputFile = process.argv[3] || inputFile.replace('.csv', '-fixed.csv')

if (!inputFile) {
  console.error('Usage: node fix_multiline_csv.mjs <input.csv> [output.csv]')
  process.exit(1)
}

const content = readFileSync(inputFile, 'utf-8')
const lines = content.split('\n')

// Row 413 is line index 413 (0-indexed), which contains the continuation
// Row 412 is line index 412, which is the main row
// We need to merge line 413 into line 412's Comments field

console.log('Original row 412:', lines[412].substring(0, 150) + '...')
console.log('Original row 413:', lines[413])

// Merge the lines by replacing the line break with a space
// Row 412 ends with: "H=9 1/2""
// Row 413 contains: L=10 13/16""\nATTACHED TO EXISTING STEEL",,
// Result should be: "H=9 1/2"" L=10 13/16"" ATTACHED TO EXISTING STEEL",,

const row412 = lines[412]
const row413 = lines[413]

// Join them with a space, removing the line break
const fixedRow412 = row412.replace(/\r?\n?$/, ' ') + row413.trim()

// Replace row 412 and remove row 413
lines[412] = fixedRow412
lines.splice(413, 1) // Remove row 413

const fixedContent = lines.join('\n')
writeFileSync(outputFile, fixedContent, 'utf-8')

console.log('\n✓ Fixed CSV created:', outputFile)
console.log('  - Merged multi-line Comments field')
console.log('  - Row 413 content moved into row 412')
console.log('\nFixed row 412:', lines[412].substring(0, 150) + '...')
