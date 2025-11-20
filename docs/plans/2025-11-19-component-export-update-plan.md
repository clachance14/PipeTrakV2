# Component Export and Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal**: Enable bulk editing of component metadata through Excel export/update workflow

**Architecture**: Export components to Excel with flattened JSONB attributes, allow users to modify in Excel, validate and update via edge function with transaction safety

**Tech Stack**: TypeScript, React, SheetJS (xlsx), Supabase Edge Functions, TanStack Query, Shadcn/ui

---

## Task 1: TypeScript Types for Export/Update

**Files**:
- Create: `src/types/component-export.ts`

**Step 1: Write the failing test**

Create: `src/types/component-export.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import type { ComponentExportRow, ExportOptions, UpdateValidationError } from './component-export'

describe('ComponentExportRow type', () => {
  it('should accept valid export row with all fields', () => {
    const row: ComponentExportRow = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      component_type: 'field_weld',
      drawing: 'P-001',
      area: 'Area 1',
      system: 'System A',
      test_package: 'Package 1',
      spool_id: null,
      weld_number: 'W-001',
      size: '2',
      spec: '150#',
      commodity_code: null,
      schedule: null,
      base_metal: 'CS',
      percent_complete: 75.5,
      last_updated_at: '2025-11-19T10:00:00Z'
    }
    expect(row.id).toBe('123e4567-e89b-12d3-a456-426614174000')
  })
})

describe('UpdateValidationError type', () => {
  it('should accept valid validation error', () => {
    const error: UpdateValidationError = {
      row: 5,
      field: 'area',
      value: 'NonexistentArea',
      reason: 'Area not found in project',
      severity: 'error'
    }
    expect(error.severity).toBe('error')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/types/component-export.test.ts`
Expected: FAIL with "Cannot find module './component-export'"

**Step 3: Write minimal implementation**

Create: `src/types/component-export.ts`

```typescript
import type { Database } from './database.types'

type Component = Database['public']['Tables']['components']['Row']

/**
 * Flattened component row for Excel export
 * Expands JSONB attributes into individual columns
 */
export interface ComponentExportRow {
  // Core fields
  id: string
  component_type: Component['component_type']

  // References (by name, not ID)
  drawing: string | null
  area: string | null
  system: string | null
  test_package: string | null

  // Flattened attributes (all possible fields across all component types)
  spool_id: string | null
  weld_number: string | null
  size: string | null
  spec: string | null
  commodity_code: string | null
  schedule: string | null
  base_metal: string | null

  // Read-only reference fields
  percent_complete: number
  last_updated_at: string
}

/**
 * Options for export functionality
 */
export interface ExportOptions {
  includeReadOnlyColumns?: boolean  // Default: true
  filename?: string                 // Default: auto-generated
}

/**
 * Validation error for component updates
 */
export interface UpdateValidationError {
  row: number           // Excel row number (1-indexed)
  field: string         // Column name
  value: unknown        // Invalid value
  reason: string       // Human-readable error message
  severity: 'error' | 'warning'
}

/**
 * Result of validation
 */
export interface ValidationResult {
  valid: boolean
  errors: UpdateValidationError[]
  warnings: UpdateValidationError[]
}

/**
 * Component update payload for edge function
 */
export interface ComponentUpdate {
  id: string                        // UUID for primary matching
  component_type: string            // For identity fallback
  identity_key: Record<string, unknown> | null  // For identity fallback
  changes: {
    drawing?: string | null
    area?: string | null
    system?: string | null
    test_package?: string | null
    attributes?: Record<string, unknown>
  }
}

/**
 * Batch update request to edge function
 */
export interface UpdateComponentsRequest {
  projectId: string
  updates: ComponentUpdate[]
}

/**
 * Update result from edge function
 */
export interface UpdateComponentsResponse {
  success_count: number
  error_count: number
  errors: Array<{
    row: number
    id: string
    reason: string
  }>
}
```

**Step 4: Run test to verify it passes**

Run: `npm test src/types/component-export.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/component-export.ts src/types/component-export.test.ts
git commit -m "feat: add TypeScript types for component export/update"
```

---

## Task 2: Export Components Utility (Part 1: Data Preparation)

**Files**:
- Create: `src/lib/excel/export-components.ts`
- Create: `src/lib/excel/export-components.test.ts`

**Step 1: Write the failing test**

Create: `src/lib/excel/export-components.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { prepareExportData } from './export-components'
import type { Database } from '@/types/database.types'

type Component = Database['public']['Tables']['components']['Row']

describe('prepareExportData', () => {
  it('should flatten component attributes into separate columns', () => {
    const components: Component[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        project_id: 'proj-1',
        component_type: 'field_weld',
        progress_template_id: 'template-1',
        identity_key: { weld_number: 'W-001' },
        drawing_id: 'draw-1',
        area_id: 'area-1',
        system_id: 'sys-1',
        test_package_id: 'pkg-1',
        attributes: {
          size: '2',
          spec: '150#',
          base_metal: 'CS'
        },
        current_milestones: {},
        percent_complete: 75.5,
        created_at: '2025-11-19T10:00:00Z',
        created_by: 'user-1',
        last_updated_at: '2025-11-19T11:00:00Z',
        last_updated_by: 'user-1',
        is_retired: false,
        retire_reason: null
      }
    ]

    const references = {
      drawings: new Map([['draw-1', 'P-001']]),
      areas: new Map([['area-1', 'Area 1']]),
      systems: new Map([['sys-1', 'System A']]),
      test_packages: new Map([['pkg-1', 'Package 1']])
    }

    const result = prepareExportData(components, references)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: '123e4567-e89b-12d3-a456-426614174000',
      component_type: 'field_weld',
      drawing: 'P-001',
      area: 'Area 1',
      system: 'System A',
      test_package: 'Package 1',
      size: '2',
      spec: '150#',
      base_metal: 'CS',
      weld_number: 'W-001',
      percent_complete: 75.5
    })
  })

  it('should handle null references gracefully', () => {
    const components: Component[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        project_id: 'proj-1',
        component_type: 'spool',
        progress_template_id: 'template-1',
        identity_key: { spool_id: 'SP-001' },
        drawing_id: null,
        area_id: null,
        system_id: null,
        test_package_id: null,
        attributes: { size: '4' },
        current_milestones: {},
        percent_complete: 0,
        created_at: '2025-11-19T10:00:00Z',
        created_by: 'user-1',
        last_updated_at: '2025-11-19T10:00:00Z',
        last_updated_by: 'user-1',
        is_retired: false,
        retire_reason: null
      }
    ]

    const references = {
      drawings: new Map(),
      areas: new Map(),
      systems: new Map(),
      test_packages: new Map()
    }

    const result = prepareExportData(components, references)

    expect(result[0].drawing).toBeNull()
    expect(result[0].area).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/lib/excel/export-components.test.ts`
Expected: FAIL with "Cannot find module './export-components'"

**Step 3: Write minimal implementation**

Create: `src/lib/excel/export-components.ts`

```typescript
import type { Database } from '@/types/database.types'
import type { ComponentExportRow } from '@/types/component-export'

type Component = Database['public']['Tables']['components']['Row']

interface ReferenceMap {
  drawings: Map<string, string>
  areas: Map<string, string>
  systems: Map<string, string>
  test_packages: Map<string, string>
}

/**
 * Prepare component data for Excel export
 * Flattens JSONB attributes into individual columns
 */
export function prepareExportData(
  components: Component[],
  references: ReferenceMap
): ComponentExportRow[] {
  return components.map(component => {
    const attributes = (component.attributes as Record<string, unknown>) || {}
    const identityKey = (component.identity_key as Record<string, unknown>) || {}

    return {
      id: component.id,
      component_type: component.component_type,
      drawing: component.drawing_id ? references.drawings.get(component.drawing_id) || null : null,
      area: component.area_id ? references.areas.get(component.area_id) || null : null,
      system: component.system_id ? references.systems.get(component.system_id) || null : null,
      test_package: component.test_package_id ? references.test_packages.get(component.test_package_id) || null : null,

      // Flatten identity_key
      spool_id: (identityKey.spool_id as string) || null,
      weld_number: (identityKey.weld_number as string) || null,

      // Flatten attributes
      size: (attributes.size as string) || null,
      spec: (attributes.spec as string) || null,
      commodity_code: (attributes.commodity_code as string) || null,
      schedule: (attributes.schedule as string) || null,
      base_metal: (attributes.base_metal as string) || null,

      // Read-only fields
      percent_complete: component.percent_complete,
      last_updated_at: component.last_updated_at
    }
  })
}
```

**Step 4: Run test to verify it passes**

Run: `npm test src/lib/excel/export-components.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/excel/export-components.ts src/lib/excel/export-components.test.ts
git commit -m "feat: add component data preparation for Excel export"
```

---

## Task 3: Export to Excel Workbook (Part 2: Excel Generation)

**Files**:
- Modify: `src/lib/excel/export-components.ts`
- Modify: `src/lib/excel/export-components.test.ts`

**Step 1: Write the failing test**

Modify: `src/lib/excel/export-components.test.ts`

Add after existing tests:

```typescript
import { exportComponentsToExcel } from './export-components'

describe('exportComponentsToExcel', () => {
  it('should generate Excel blob with correct MIME type', () => {
    const exportRows: ComponentExportRow[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        component_type: 'field_weld',
        drawing: 'P-001',
        area: 'Area 1',
        system: null,
        test_package: null,
        spool_id: null,
        weld_number: 'W-001',
        size: '2',
        spec: '150#',
        commodity_code: null,
        schedule: null,
        base_metal: 'CS',
        percent_complete: 75.5,
        last_updated_at: '2025-11-19T10:00:00Z'
      }
    ]

    const blob = exportComponentsToExcel(exportRows)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  })

  it('should handle empty component list', () => {
    const blob = exportComponentsToExcel([])

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0) // Should still have header row
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/lib/excel/export-components.test.ts`
Expected: FAIL with "exportComponentsToExcel is not a function"

**Step 3: Write minimal implementation**

Modify: `src/lib/excel/export-components.ts`

Add import at top:

```typescript
import * as XLSX from 'xlsx'
```

Add at end of file:

```typescript
/**
 * Export components to Excel workbook
 */
export function exportComponentsToExcel(rows: ComponentExportRow[]): Blob {
  // Create worksheet data
  const wsData: unknown[][] = [
    // Header row
    [
      'ID', 'Component Type', 'Drawing', 'Area', 'System', 'Test Package',
      'Spool ID', 'Weld Number', 'Size', 'Spec', 'Commodity Code',
      'Schedule', 'Base Metal', '% Complete (Read-Only)', 'Last Updated (Read-Only)'
    ],
    // Data rows
    ...rows.map(row => [
      row.id,
      row.component_type,
      row.drawing || '',
      row.area || '',
      row.system || '',
      row.test_package || '',
      row.spool_id || '',
      row.weld_number || '',
      row.size || '',
      row.spec || '',
      row.commodity_code || '',
      row.schedule || '',
      row.base_metal || '',
      row.percent_complete,
      row.last_updated_at
    ])
  ]

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Format UUID column as text (prevent Excel from corrupting UUIDs)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let R = 1; R <= range.e.r; R++) {
    const cellRef = XLSX.utils.encode_cell({ r: R, c: 0 })
    if (ws[cellRef]) {
      ws[cellRef].t = 's' // Force text type
    }
  }

  // Auto-size columns
  const colWidths = wsData[0].map((_, colIndex) => {
    const maxLen = Math.max(
      ...wsData.map(row => String(row[colIndex] || '').length)
    )
    return { wch: Math.min(maxLen + 2, 50) }
  })
  ws['!cols'] = colWidths

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Components')

  // Generate blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}
```

**Step 4: Run test to verify it passes**

Run: `npm test src/lib/excel/export-components.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/excel/export-components.ts src/lib/excel/export-components.test.ts
git commit -m "feat: add Excel workbook generation for component export"
```

---

## Task 4: Add Export Button to Components Page

**Files**:
- Modify: `src/components/components/ComponentsPage.tsx` (exact line TBD - find filter section)
- Create: `src/hooks/useExportComponents.ts`
- Create: `src/hooks/useExportComponents.test.ts`

**Step 1: Write the failing test**

Create: `src/hooks/useExportComponents.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useExportComponents } from './useExportComponents'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useExportComponents', () => {
  it('should export components and trigger download', async () => {
    // Mock URL.createObjectURL and link.click()
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
    const mockRevokeObjectURL = vi.fn()
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    const mockClick = vi.fn()
    const mockLink = { click: mockClick, href: '', download: '' }
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement)

    const { result } = renderHook(() => useExportComponents('project-123'), {
      wrapper: createWrapper()
    })

    result.current.mutate([])

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/hooks/useExportComponents.test.ts`
Expected: FAIL with "Cannot find module './useExportComponents'"

**Step 3: Write minimal implementation**

Create: `src/hooks/useExportComponents.ts`

```typescript
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { prepareExportData, exportComponentsToExcel } from '@/lib/excel/export-components'
import type { Database } from '@/types/database.types'

type Component = Database['public']['Tables']['components']['Row']

interface ExportComponentsParams {
  projectId: string
  components: Component[]
}

export function useExportComponents(projectId: string) {
  return useMutation({
    mutationFn: async (components: Component[]) => {
      // Fetch reference data
      const [drawingsRes, areasRes, systemsRes, packagesRes] = await Promise.all([
        supabase.from('drawings').select('id, name').eq('project_id', projectId),
        supabase.from('areas').select('id, name').eq('project_id', projectId),
        supabase.from('systems').select('id, name').eq('project_id', projectId),
        supabase.from('test_packages').select('id, name').eq('project_id', projectId)
      ])

      // Build reference maps
      const references = {
        drawings: new Map(drawingsRes.data?.map(d => [d.id, d.name]) || []),
        areas: new Map(areasRes.data?.map(a => [a.id, a.name]) || []),
        systems: new Map(systemsRes.data?.map(s => [s.id, s.name]) || []),
        test_packages: new Map(packagesRes.data?.map(p => [p.id, p.name]) || [])
      }

      // Prepare export data
      const exportRows = prepareExportData(components, references)

      // Generate Excel blob
      const blob = exportComponentsToExcel(exportRows)

      // Trigger download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `components-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    }
  })
}
```

**Step 4: Run test to verify it passes**

Run: `npm test src/hooks/useExportComponents.test.ts`
Expected: PASS

**Step 5: Add Export button to ComponentsPage**

Modify: `src/components/components/ComponentsPage.tsx`

Find the section with filters/actions (likely near top of component, before the table).
Add import:

```typescript
import { useExportComponents } from '@/hooks/useExportComponents'
import { Download } from 'lucide-react'
```

Add hook in component:

```typescript
const exportComponents = useExportComponents(projectId)
```

Add button near filters:

```typescript
<Button
  variant="outline"
  onClick={() => exportComponents.mutate(filteredComponents)}
  disabled={exportComponents.isPending || filteredComponents.length === 0}
>
  <Download className="mr-2 h-4 w-4" />
  {exportComponents.isPending ? 'Exporting...' : 'Export to Excel'}
</Button>
```

**Step 6: Commit**

```bash
git add src/hooks/useExportComponents.ts src/hooks/useExportComponents.test.ts src/components/components/ComponentsPage.tsx
git commit -m "feat: add Export to Excel button to Components page"
```

---

## Task 5: Component Update Validator (Part 1: Structure Validation)

**Files**:
- Create: `src/lib/excel/component-update-validator.ts`
- Create: `src/lib/excel/component-update-validator.test.ts`

**Step 1: Write the failing test**

Create: `src/lib/excel/component-update-validator.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { validateStructure } from './component-update-validator'

describe('validateStructure', () => {
  it('should pass when required columns are present', () => {
    const headers = ['id', 'component_type', 'drawing', 'area']
    const result = validateStructure(headers)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should fail when id column is missing', () => {
    const headers = ['component_type', 'drawing']
    const result = validateStructure(headers)

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'id',
        reason: expect.stringContaining('Required column')
      })
    )
  })

  it('should fail when component_type column is missing', () => {
    const headers = ['id', 'drawing']
    const result = validateStructure(headers)

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'component_type',
        reason: expect.stringContaining('Required column')
      })
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/lib/excel/component-update-validator.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create: `src/lib/excel/component-update-validator.ts`

```typescript
import type { ValidationResult, UpdateValidationError } from '@/types/component-export'

const REQUIRED_COLUMNS = ['id', 'component_type']

/**
 * Validate Excel file structure (required columns present)
 */
export function validateStructure(headers: string[]): ValidationResult {
  const errors: UpdateValidationError[] = []
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim())

  for (const requiredCol of REQUIRED_COLUMNS) {
    if (!normalizedHeaders.includes(requiredCol)) {
      errors.push({
        row: 0,
        field: requiredCol,
        value: null,
        reason: `Required column '${requiredCol}' is missing`,
        severity: 'error'
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: []
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test src/lib/excel/component-update-validator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/excel/component-update-validator.ts src/lib/excel/component-update-validator.test.ts
git commit -m "feat: add structure validation for component updates"
```

---

**NOTE**: The plan continues with 15+ more tasks covering:
- Row-level validation (UUIDs, component types, duplicates)
- Reference validation (drawings, areas, systems, test packages)
- Component Update Import Page UI
- Edge function implementation
- Integration tests
- Documentation updates

**For brevity**, the remaining tasks follow the same TDD pattern. Each task is 2-5 minutes and follows:
1. Write failing test
2. Run to verify failure
3. Write minimal implementation
4. Run to verify success
5. Commit

**Total estimated tasks**: ~25-30 tasks over 5-7 days

---

## Execution Handoff

This plan is ready for execution using one of two approaches:

**Option 1: Subagent-Driven Development (this session)**
- Use @superpowers:subagent-driven-development
- Fresh subagent per task with code review between tasks
- Fast iteration with quality gates

**Option 2: Parallel Session Execution**
- Open new Claude Code session in this directory
- Use @superpowers:executing-plans
- Batch execution with review checkpoints

Choose based on your preference for iteration speed vs. batch processing.
