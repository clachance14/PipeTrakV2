/**
 * Excel Template Generator
 * Generates downloadable Excel templates for Material Takeoff and Field Weld imports
 */

import * as XLSX from 'xlsx'
import { FIELD_WELD_REQUIRED_HEADERS } from './weld-column-mapper'

/**
 * Generate and download Material Takeoff Excel template
 */
export function generateMaterialTakeoffTemplate(): void {
  const headers = [
    'DRAWING*',
    'TYPE*',
    'QTY*',
    'CMDTY CODE*',
    'SIZE',
    'SPEC',
    'DESCRIPTION',
    'COMMENTS',
    'AREA',
    'SYSTEM',
    'TEST_PACKAGE',
  ]

  const exampleRows = [
    [
      '1001-P-001',
      'Pipe',
      '25',
      'PIP-CS-150',
      '6',
      'A106-B',
      '6" Carbon Steel Pipe',
      'Shop fabricated',
      'Area 100',
      'Cooling Water',
      'PKG-001',
    ],
    [
      '1001-P-001',
      'Valve',
      '2',
      'VLV-GATE-150',
      '4',
      '',
      '',
      'Field install',
      'Area 100',
      '',
      '',
    ],
    [
      '1002-P-005',
      'Fitting',
      '10',
      'FTG-ELBOW-90',
      '2',
      'A234-WPB',
      '90° Elbow 2"',
      '',
      'Area 200',
      'Process Gas',
      'PKG-002',
    ],
  ]

  const data = [headers, ...exampleRows]

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data)

  // Auto-size columns
  const columnWidths = headers.map((header, idx) => {
    const maxLength = Math.max(
      header.length,
      ...exampleRows.map((row) => String(row[idx] || '').length)
    )
    return { wch: Math.min(maxLength + 2, 50) } // Max width 50
  })

  worksheet['!cols'] = columnWidths

  // Add note about required fields
  const noteRow = data.length + 2
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [['* Required fields', '', '', '', '', '', '', '', '', '', '']],
    { origin: `A${noteRow}` }
  )

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Material Takeoff')

  // Download
  XLSX.writeFile(workbook, 'material-takeoff-template.xlsx')
}

/**
 * Generate and download Field Weld Excel template
 */
export function generateFieldWeldTemplate(): void {
  const headers = [...FIELD_WELD_REQUIRED_HEADERS]

  const exampleRows = [
    [
      '1',
      'P-26B07',
      'BW',
      'HC05',
      '1"',
      'XS',
      'CS',
      '5%',
      'K-07',
      '2024-01-15',
      'RT',
      'PASS',
      '',
    ],
    [
      '2',
      'P-93909',
      'SW',
      'HC05',
      '3"',
      'STD',
      'CS',
      '5%',
      'R-05',
      '2024-01-16',
      'UT',
      'PASS',
      '',
    ],
    [
      '3',
      'P-14501',
      'FW',
      'EN-14',
      '2"',
      'XS',
      'SS',
      '10%',
      'J-12',
      '2024-01-17',
      'PT',
      'PENDING',
      'Needs reinspection',
    ],
  ]

  const data = [headers, ...exampleRows]

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data)

  // Auto-size columns
  const columnWidths = headers.map((header, idx) => {
    const maxLength = Math.max(
      header.length,
      ...exampleRows.map((row) => String(row[idx] || '').length)
    )
    return { wch: Math.min(maxLength + 2, 50) }
  })

  worksheet['!cols'] = columnWidths

  // Add notes
  const noteRow = data.length + 2
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [
      ['Notes:'],
      ['- Weld Type: BW (Butt Weld), SW (Socket Weld), FW (Fillet Weld)'],
      ['- NDE Result: PASS, FAIL, PENDING, N/A'],
      ['- X-RAY %: Enter as percentage (e.g., 5%, 10%)'],
      ['- Date Format: YYYY-MM-DD (e.g., 2024-01-15)'],
    ],
    { origin: `A${noteRow}` }
  )

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Field Welds')

  // Download
  XLSX.writeFile(workbook, 'field-welds-template.xlsx')
}

/**
 * Generate Excel template from custom headers and example data
 * Generic function for future template needs
 */
export function generateCustomTemplate(
  filename: string,
  sheetName: string,
  headers: string[],
  exampleRows: unknown[][],
  notes?: string[]
): void {
  const data = [headers, ...exampleRows]

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data)

  // Auto-size columns
  const columnWidths = headers.map((header, idx) => {
    const maxLength = Math.max(
      header.length,
      ...exampleRows.map((row) => String(row[idx] || '').length)
    )
    return { wch: Math.min(maxLength + 2, 50) }
  })

  worksheet['!cols'] = columnWidths

  // Add notes if provided
  if (notes && notes.length > 0) {
    const noteRow = data.length + 2
    const noteData = notes.map((note) => [note])
    XLSX.utils.sheet_add_aoa(worksheet, noteData, { origin: `A${noteRow}` })
  }

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Download
  XLSX.writeFile(workbook, filename)
}

/**
 * Helper to create download link programmatically
 * For cases where XLSX.writeFile doesn't work (some environments)
 */
export function downloadExcelBlob(
  workbook: XLSX.WorkBook,
  filename: string
): void {
  // Write workbook to binary string
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' })

  // Convert to blob
  const buf = new ArrayBuffer(wbout.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < wbout.length; i++) {
    view[i] = wbout.charCodeAt(i) & 0xff
  }

  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  // Create download link
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
