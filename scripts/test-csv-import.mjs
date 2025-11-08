#!/usr/bin/env node
/**
 * Test script for CSV import functionality
 * Tests the Dark Knight CSV file with column mapping and validation
 */

import Papa from 'papaparse';
import { readFileSync } from 'fs';
import { mapColumns } from './src/lib/csv/column-mapper.ts';
import { validateRows, createValidationSummary } from './src/lib/csv/csv-validator.ts';

console.log('Testing CSV Import with Dark Knight file...\n');

// Read CSV file
const csvPath = './test-data/dark-knight-full.csv';
const csvContent = readFileSync(csvPath, 'utf-8');

// Parse CSV
const parseResult = Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim()
});

console.log(`📄 File: ${csvPath}`);
console.log(`📊 Total rows parsed: ${parseResult.data.length}`);
console.log(`❌ Parse errors: ${parseResult.errors.length}\n`);

// Get CSV columns
const csvColumns = parseResult.meta.fields || [];
console.log('📋 CSV Columns:', csvColumns.join(', '));
console.log();

// Map columns
const mappingResult = mapColumns(csvColumns);
console.log('🔗 Column Mappings:');
mappingResult.mappings.forEach(m => {
  console.log(`  ${m.csvColumn} → ${m.expectedField} (${m.confidence}% ${m.matchTier})`);
});

if (mappingResult.unmappedColumns.length > 0) {
  console.log('\n⚠️  Unmapped columns:', mappingResult.unmappedColumns.join(', '));
}

if (mappingResult.missingRequiredFields.length > 0) {
  console.log('\n❌ Missing required fields:', mappingResult.missingRequiredFields.join(', '));
} else {
  console.log('\n✅ All required fields mapped!');
}

console.log();

// Create column lookup map for validation
const columnLookupMap = new Map();
mappingResult.mappings.forEach(m => {
  columnLookupMap.set(m.csvColumn, m.expectedField);
});

// Validate rows (first 100 for quick test)
console.log('🔍 Validating rows...');
const rowsToValidate = parseResult.data.slice(0, 100);
const validationResults = validateRows(rowsToValidate, columnLookupMap);
const summary = createValidationSummary(validationResults);

console.log();
console.log('📈 Validation Summary (first 100 rows):');
console.log(`  Total: ${summary.totalRows}`);
console.log(`  ✅ Valid: ${summary.validCount}`);
console.log(`  ⚠️  Skipped: ${summary.skippedCount}`);
console.log(`  ❌ Errors: ${summary.errorCount}`);
console.log(`  Can Import: ${summary.canImport ? '✅ YES' : '❌ NO'}`);

// Show skipped rows by category
if (summary.skippedCount > 0) {
  console.log('\n⚠️  Skipped Row Details:');
  Object.entries(summary.resultsByCategory).forEach(([category, results]) => {
    if (results.length > 0 && category !== 'missing_required_field' && category !== 'empty_drawing') {
      console.log(`  ${category}: ${results.length} rows`);
      results.slice(0, 3).forEach(r => {
        console.log(`    - Row ${r.rowNumber}: ${r.reason}`);
      });
    }
  });
}

// Show error details if any
if (summary.errorCount > 0) {
  console.log('\n❌ Error Details:');
  summary.resultsByStatus.error.slice(0, 5).forEach(r => {
    console.log(`  Row ${r.rowNumber}: ${r.reason}`);
  });
}

console.log('\n✅ Test complete!');
