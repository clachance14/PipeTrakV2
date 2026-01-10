/**
 * weldLogPdfMake.test.ts
 *
 * Unit tests for pdfmake-based Weld Log PDF generator.
 * Written first following TDD approach.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds';

// Mock pdfmake to avoid loading the actual library in tests
vi.mock('pdfmake/build/pdfmake', () => ({
  default: {
    vfs: {},
    createPdf: vi.fn(() => ({
      getBlob: vi.fn((callback) => {
        // Return a mock Blob
        callback(new Blob(['mock pdf content'], { type: 'application/pdf' }));
      }),
      getBase64: vi.fn((callback) => {
        callback(btoa('mock pdf content'));
      }),
    })),
  },
}));

// Mock vfs_fonts for pdfmake 0.1.72
vi.mock('pdfmake/build/vfs_fonts', () => ({
  pdfMake: {
    vfs: {
      'Roboto-Regular.ttf': 'mock-font-data',
      'Roboto-Medium.ttf': 'mock-font-data',
      'Roboto-Italic.ttf': 'mock-font-data',
      'Roboto-MediumItalic.ttf': 'mock-font-data',
    },
  },
}));

/**
 * Create a mock EnrichedFieldWeld for testing
 */
function createMockWeld(overrides: Partial<EnrichedFieldWeld> = {}): EnrichedFieldWeld {
  return {
    id: 'weld-1',
    component_id: 'comp-1',
    project_id: 'proj-1',
    weld_type: 'BW',
    weld_size: '2"',
    schedule: '40',
    base_metal: 'CS',
    spec: 'A106',
    welder_id: 'welder-1',
    date_welded: '2025-01-15',
    nde_required: true,
    nde_type: 'RT',
    nde_result: 'PASS',
    nde_date: '2025-01-16',
    nde_notes: null,
    status: 'active',
    original_weld_id: null,
    is_repair: false,
    is_unplanned: false,
    notes: null,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
    component: {
      id: 'comp-1',
      drawing_id: 'drawing-1',
      type: 'field_weld',
      identity_key: { weld_number: 'W-001' },
      percent_complete: 50,
      current_milestones: {},
      area_id: 'area-1',
      system_id: 'system-1',
      test_package_id: 'pkg-1',
    },
    drawing: {
      id: 'drawing-1',
      drawing_no_norm: 'P-001',
      project_id: 'proj-1',
    },
    welder: {
      id: 'welder-1',
      stencil: 'G-75',
      name: 'Jesus Gutierrez',
      status: 'verified',
    },
    area: {
      id: 'area-1',
      name: 'Rail Car Loading',
      description: null,
    },
    system: {
      id: 'system-1',
      name: 'Process',
      description: null,
    },
    test_package: {
      id: 'pkg-1',
      name: 'TP-08',
      description: null,
    },
    identityDisplay: 'W-001',
    ...overrides,
  };
}

describe('weldLogPdfMake', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateWeldLogPdfMake', () => {
    it('should export the generateWeldLogPdfMake function', async () => {
      const { generateWeldLogPdfMake } = await import('./weldLogPdfMake');
      expect(typeof generateWeldLogPdfMake).toBe('function');
    });

    it('should return a Blob when given valid data', async () => {
      const { generateWeldLogPdfMake } = await import('./weldLogPdfMake');
      const mockWelds = [createMockWeld()];

      const result = await generateWeldLogPdfMake({
        welds: mockWelds,
        projectName: 'Test Project',
        generatedDate: '2025-01-15',
      });

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
    });

    it('should handle empty welds array', async () => {
      const { generateWeldLogPdfMake } = await import('./weldLogPdfMake');

      const result = await generateWeldLogPdfMake({
        welds: [],
        projectName: 'Test Project',
        generatedDate: '2025-01-15',
      });

      expect(result).toBeInstanceOf(Blob);
    });

    it('should accept optional companyLogo parameter', async () => {
      const { generateWeldLogPdfMake } = await import('./weldLogPdfMake');
      const mockWelds = [createMockWeld()];
      const base64Logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const result = await generateWeldLogPdfMake({
        welds: mockWelds,
        projectName: 'Test Project',
        generatedDate: '2025-01-15',
        companyLogo: base64Logo,
      });

      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('transformWeldToRow', () => {
    it('should export the transformWeldToRow function', async () => {
      const { transformWeldToRow } = await import('./weldLogPdfMake');
      expect(typeof transformWeldToRow).toBe('function');
    });

    it('should transform weld to array of 10 string values', async () => {
      const { transformWeldToRow } = await import('./weldLogPdfMake');
      const mockWeld = createMockWeld();

      const result = transformWeldToRow(mockWeld);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(10);
      result.forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });

    it('should format welder as "stencil - name"', async () => {
      const { transformWeldToRow } = await import('./weldLogPdfMake');
      const mockWeld = createMockWeld({
        welder: {
          id: 'welder-1',
          stencil: 'G-75',
          name: 'Jesus Gutierrez',
          status: 'verified',
        },
      });

      const result = transformWeldToRow(mockWeld);

      expect(result[2]).toBe('G-75 - Jesus Gutierrez');
    });

    it('should show "Not Assigned" when welder is null', async () => {
      const { transformWeldToRow } = await import('./weldLogPdfMake');
      const mockWeld = createMockWeld({ welder: null });

      const result = transformWeldToRow(mockWeld);

      expect(result[2]).toBe('Not Assigned');
    });

    it('should format date as locale string', async () => {
      const { transformWeldToRow } = await import('./weldLogPdfMake');
      const mockWeld = createMockWeld({ date_welded: '2025-12-15' });

      const result = transformWeldToRow(mockWeld);

      // Date formatting is locale-dependent, just check it's not the raw ISO string
      expect(result[3]).not.toBe('2025-12-15');
      expect(result[3]).toMatch(/\d+/); // Contains numbers
    });

    it('should show "-" for null date', async () => {
      const { transformWeldToRow } = await import('./weldLogPdfMake');
      const mockWeld = createMockWeld({ date_welded: null });

      const result = transformWeldToRow(mockWeld);

      expect(result[3]).toBe('-');
    });

    it('should show "-" for null optional fields', async () => {
      const { transformWeldToRow } = await import('./weldLogPdfMake');
      const mockWeld = createMockWeld({
        weld_size: null,
        nde_result: null,
        area: null,
        system: null,
        test_package: null,
      });

      const result = transformWeldToRow(mockWeld);

      expect(result[5]).toBe('-'); // size
      expect(result[6]).toBe('-'); // nde_result
      expect(result[7]).toBe('-'); // area
      expect(result[8]).toBe('-'); // system
      expect(result[9]).toBe('-'); // test_package
    });

    it('should include all expected fields in correct order', async () => {
      const { transformWeldToRow } = await import('./weldLogPdfMake');
      const mockWeld = createMockWeld();

      const result = transformWeldToRow(mockWeld);

      // Column order: Weld ID, Drawing, Welder, Date Welded, Type, Size, NDE Result, Area, System, Test Package
      expect(result[0]).toBe('W-001'); // identityDisplay
      expect(result[1]).toBe('P-001'); // drawing.drawing_no_norm
      expect(result[2]).toBe('G-75 - Jesus Gutierrez'); // welder
      // result[3] is date - locale dependent
      expect(result[4]).toBe('BW'); // weld_type
      expect(result[5]).toBe('2"'); // weld_size
      expect(result[6]).toBe('PASS'); // nde_result
      expect(result[7]).toBe('Rail Car Loading'); // area.name
      expect(result[8]).toBe('Process'); // system.name
      expect(result[9]).toBe('TP-08'); // test_package.name
    });
  });

  describe('buildDocDefinition', () => {
    it('should export the buildDocDefinition function', async () => {
      const { buildDocDefinition } = await import('./weldLogPdfMake');
      expect(typeof buildDocDefinition).toBe('function');
    });

    it('should create document with LETTER page size and landscape orientation', async () => {
      const { buildDocDefinition } = await import('./weldLogPdfMake');
      const mockWelds = [createMockWeld()];

      const docDef = buildDocDefinition({
        welds: mockWelds,
        projectName: 'Test Project',
        generatedDate: '2025-01-15',
      });

      expect(docDef.pageSize).toBe('LETTER');
      expect(docDef.pageOrientation).toBe('landscape');
    });

    it('should set correct page margins', async () => {
      const { buildDocDefinition } = await import('./weldLogPdfMake');
      const mockWelds = [createMockWeld()];

      const docDef = buildDocDefinition({
        welds: mockWelds,
        projectName: 'Test Project',
        generatedDate: '2025-01-15',
      });

      // [left, top, right, bottom]
      expect(docDef.pageMargins).toEqual([40, 90, 40, 40]);
    });

    it('should include header function', async () => {
      const { buildDocDefinition } = await import('./weldLogPdfMake');
      const mockWelds = [createMockWeld()];

      const docDef = buildDocDefinition({
        welds: mockWelds,
        projectName: 'Test Project',
        generatedDate: '2025-01-15',
      });

      expect(typeof docDef.header).toBe('function');
    });

    it('should include footer function', async () => {
      const { buildDocDefinition } = await import('./weldLogPdfMake');
      const mockWelds = [createMockWeld()];

      const docDef = buildDocDefinition({
        welds: mockWelds,
        projectName: 'Test Project',
        generatedDate: '2025-01-15',
      });

      expect(typeof docDef.footer).toBe('function');
    });

    it('should include table with headerRows: 1 for repeating headers', async () => {
      const { buildDocDefinition } = await import('./weldLogPdfMake');
      const mockWelds = [createMockWeld()];

      const docDef = buildDocDefinition({
        welds: mockWelds,
        projectName: 'Test Project',
        generatedDate: '2025-01-15',
      });

      // Find the table in content
      const tableContent = docDef.content.find(
        (item: unknown) => typeof item === 'object' && item !== null && 'table' in item
      );
      expect(tableContent).toBeDefined();
      expect(tableContent.table.headerRows).toBe(1);
    });

    it('should have 10 columns in table widths', async () => {
      const { buildDocDefinition } = await import('./weldLogPdfMake');
      const mockWelds = [createMockWeld()];

      const docDef = buildDocDefinition({
        welds: mockWelds,
        projectName: 'Test Project',
        generatedDate: '2025-01-15',
      });

      const tableContent = docDef.content.find(
        (item: unknown) => typeof item === 'object' && item !== null && 'table' in item
      );
      expect(tableContent.table.widths).toHaveLength(10);
    });

    it('should include title "PipeTrak Weld Log"', async () => {
      const { buildDocDefinition } = await import('./weldLogPdfMake');
      const mockWelds = [createMockWeld()];

      const docDef = buildDocDefinition({
        welds: mockWelds,
        projectName: 'Test Project',
        generatedDate: '2025-01-15',
      });

      const titleContent = docDef.content.find(
        (item: unknown) => typeof item === 'object' && item !== null && 'text' in item && item.text === 'PipeTrak Weld Log'
      );
      expect(titleContent).toBeDefined();
    });

    it('should include styles for tableHeader', async () => {
      const { buildDocDefinition } = await import('./weldLogPdfMake');
      const mockWelds = [createMockWeld()];

      const docDef = buildDocDefinition({
        welds: mockWelds,
        projectName: 'Test Project',
        generatedDate: '2025-01-15',
      });

      expect(docDef.styles).toBeDefined();
      expect(docDef.styles.tableHeader).toBeDefined();
      expect(docDef.styles.tableHeader.bold).toBe(true);
      expect(docDef.styles.tableHeader.color).toBe('#FFFFFF');
    });
  });

  describe('COLUMN_HEADERS constant', () => {
    it('should export COLUMN_HEADERS with 10 items', async () => {
      const { COLUMN_HEADERS } = await import('./weldLogPdfMake');

      expect(COLUMN_HEADERS).toHaveLength(10);
    });

    it('should have correct header labels', async () => {
      const { COLUMN_HEADERS } = await import('./weldLogPdfMake');

      expect(COLUMN_HEADERS).toEqual([
        'Weld ID',
        'Drawing',
        'Welder',
        'Date Welded',
        'Type',
        'Size',
        'NDE Result',
        'Area',
        'System',
        'Test Package',
      ]);
    });
  });

  describe('COLUMN_WIDTHS constant', () => {
    it('should export COLUMN_WIDTHS with 10 items', async () => {
      const { COLUMN_WIDTHS } = await import('./weldLogPdfMake');

      expect(COLUMN_WIDTHS).toHaveLength(10);
    });

    it('should have widths that sum to approximately 100%', async () => {
      const { COLUMN_WIDTHS } = await import('./weldLogPdfMake');

      // Parse percentages and sum
      const total = COLUMN_WIDTHS.reduce((sum, width) => {
        const numericValue = parseFloat(width.replace('%', ''));
        return sum + numericValue;
      }, 0);

      // Should be close to 100% (allow for rounding)
      expect(total).toBeGreaterThanOrEqual(95);
      expect(total).toBeLessThanOrEqual(100);
    });
  });
});
