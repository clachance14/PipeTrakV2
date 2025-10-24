/**
 * Edge Function Tests: Import Field Welds (T025)
 * Tests CSV import validation and processing
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts'
import { parseCsv, validateHeaders } from './parser.ts'
import { validateRow, validateUniqueWeldIds } from './validator.ts'

// Test parseCsv with valid CSV
Deno.test('parseCsv: Valid CSV succeeds', () => {
  const csvContent = `Weld ID Number,Drawing / Isometric Number,Weld Type,SPEC,Weld Size
1,P-001,BW,HC05,2"
2,P-002,SW,HC05,1"`

  const { data, errors } = parseCsv(csvContent)

  assertEquals(data.length, 2)
  assertEquals(data[0]['Weld ID Number'], '1')
  assertEquals(data[0]['Drawing / Isometric Number'], 'P-001')
  assertEquals(data[0]['Weld Type'], 'BW')
  assertEquals(errors.length, 0)
})

// Test parseCsv with BOM marker
Deno.test('parseCsv: Handles BOM marker from Excel exports', () => {
  const csvContent = '\uFEFFWeld ID Number,Drawing / Isometric Number,Weld Type\n1,P-001,BW'

  const { data, errors } = parseCsv(csvContent)

  assertEquals(data.length, 1)
  assertEquals(data[0]['Weld ID Number'], '1')
  assertEquals(errors.length, 0)
})

// Test parseCsv with quoted fields
Deno.test('parseCsv: Handles quoted fields with commas', () => {
  const csvContent = `Weld ID Number,Drawing / Isometric Number,Weld Type,Comments
1,P-001,BW,"Contains, comma"
2,P-002,SW,No comma`

  const { data, errors } = parseCsv(csvContent)

  assertEquals(data.length, 2)
  assertEquals(data[0].Comments, 'Contains, comma')
  assertEquals(data[1].Comments, 'No comma')
  assertEquals(errors.length, 0)
})

// Test validateHeaders with required columns
Deno.test('validateHeaders: Valid headers pass', () => {
  const headers = ['Weld ID Number', 'Drawing / Isometric Number', 'Weld Type', 'SPEC', 'Weld Size']

  const errors = validateHeaders(headers)

  assertEquals(errors.length, 0)
})

// Test validateHeaders with missing required columns
Deno.test('validateHeaders: Missing required column fails', () => {
  const headers = ['Weld ID Number', 'Drawing / Isometric Number'] // Missing Weld Type

  const errors = validateHeaders(headers)

  assertEquals(errors.length, 1)
  assertExists(errors[0])
  assertEquals(errors[0].includes('Weld Type'), true)
})

// Test validateRow with valid weld type
Deno.test('validateRow: Valid weld type passes', () => {
  const row = {
    'Weld ID Number': '1',
    'Drawing / Isometric Number': 'P-001',
    'Weld Type': 'BW',
  }

  const errors = validateRow(row, 2)

  assertEquals(errors.length, 0)
})

// Test validateRow with invalid weld type
Deno.test('validateRow: Invalid weld type fails', () => {
  const row = {
    'Weld ID Number': '1',
    'Drawing / Isometric Number': 'P-001',
    'Weld Type': 'XW', // Invalid type
  }

  const errors = validateRow(row, 2)

  assertEquals(errors.length, 1)
  assertEquals(errors[0].row, 2)
  assertEquals(errors[0].message.includes('Invalid weld type'), true)
})

// Test validateRow with missing required field
Deno.test('validateRow: Missing Weld ID Number fails', () => {
  const row = {
    'Drawing / Isometric Number': 'P-001',
    'Weld Type': 'BW',
  }

  const errors = validateRow(row, 2)

  assertEquals(errors.length, 1)
  assertEquals(errors[0].row, 2)
  assertEquals(errors[0].column, 'Weld ID Number')
  assertEquals(errors[0].message.includes('required'), true)
})

// Test validateRow with missing drawing
Deno.test('validateRow: Missing Drawing fails', () => {
  const row = {
    'Weld ID Number': '1',
    'Weld Type': 'BW',
  }

  const errors = validateRow(row, 2)

  assertEquals(errors.length, 1)
  assertEquals(errors[0].column, 'Drawing / Isometric Number')
})

// Test validateRow with invalid NDE result
Deno.test('validateRow: Invalid NDE result fails', () => {
  const row = {
    'Weld ID Number': '1',
    'Drawing / Isometric Number': 'P-001',
    'Weld Type': 'BW',
    'NDE Result': 'INVALID', // Should be PASS/FAIL/PENDING
  }

  const errors = validateRow(row, 2)

  assertEquals(errors.length, 1)
  assertEquals(errors[0].message.includes('Invalid NDE result'), true)
})

// Test validateRow with valid NDE result PASS
Deno.test('validateRow: Valid NDE result PASS passes', () => {
  const row = {
    'Weld ID Number': '1',
    'Drawing / Isometric Number': 'P-001',
    'Weld Type': 'BW',
    'NDE Result': 'PASS',
  }

  const errors = validateRow(row, 2)

  assertEquals(errors.length, 0)
})

// Test validateRow with valid NDE result FAIL
Deno.test('validateRow: Valid NDE result FAIL passes', () => {
  const row = {
    'Weld ID Number': '1',
    'Drawing / Isometric Number': 'P-001',
    'Weld Type': 'BW',
    'NDE Result': 'FAIL',
  }

  const errors = validateRow(row, 2)

  assertEquals(errors.length, 0)
})

// Test validateRow with valid NDE result PENDING
Deno.test('validateRow: Valid NDE result PENDING passes', () => {
  const row = {
    'Weld ID Number': '1',
    'Drawing / Isometric Number': 'P-001',
    'Weld Type': 'BW',
    'NDE Result': 'PENDING',
  }

  const errors = validateRow(row, 2)

  assertEquals(errors.length, 0)
})

// Test validateUniqueWeldIds with duplicate weld IDs
Deno.test('validateUniqueWeldIds: Duplicate weld ID fails', () => {
  const rows = [
    {
      'Weld ID Number': '1',
      'Drawing / Isometric Number': 'P-001',
      'Weld Type': 'BW',
    },
    {
      'Weld ID Number': '1', // Duplicate
      'Drawing / Isometric Number': 'P-002',
      'Weld Type': 'SW',
    },
  ]

  const errors = validateUniqueWeldIds(rows)

  assertEquals(errors.length, 1)
  assertEquals(errors[0].message.includes('Duplicate'), true)
  assertEquals(errors[0].message.includes('1'), true)
})

// Test validateUniqueWeldIds with unique weld IDs
Deno.test('validateUniqueWeldIds: Unique weld IDs pass', () => {
  const rows = [
    {
      'Weld ID Number': '1',
      'Drawing / Isometric Number': 'P-001',
      'Weld Type': 'BW',
    },
    {
      'Weld ID Number': '2',
      'Drawing / Isometric Number': 'P-002',
      'Weld Type': 'SW',
    },
  ]

  const errors = validateUniqueWeldIds(rows)

  assertEquals(errors.length, 0)
})

// Test all valid weld types (BW, SW, FW, TW)
Deno.test('validateRow: All valid weld types pass', () => {
  const weldTypes = ['BW', 'SW', 'FW', 'TW']

  weldTypes.forEach((weldType) => {
    const row = {
      'Weld ID Number': '1',
      'Drawing / Isometric Number': 'P-001',
      'Weld Type': weldType,
    }

    const errors = validateRow(row, 2)
    assertEquals(errors.length, 0, `Weld type ${weldType} should be valid`)
  })
})

// Test empty CSV
Deno.test('parseCsv: Empty CSV returns no rows', () => {
  const csvContent = 'Weld ID Number,Drawing / Isometric Number,Weld Type'

  const { data, errors } = parseCsv(csvContent)

  assertEquals(data.length, 0)
  assertEquals(errors.length, 0)
})

// Test CSV with only whitespace in required fields
Deno.test('validateRow: Whitespace-only required fields fail', () => {
  const row = {
    'Weld ID Number': '  ',
    'Drawing / Isometric Number': 'P-001',
    'Weld Type': 'BW',
  }

  const errors = validateRow(row, 2)

  assertEquals(errors.length, 1)
  assertEquals(errors[0].column, 'Weld ID Number')
})
