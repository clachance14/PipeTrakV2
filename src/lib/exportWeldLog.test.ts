/**
 * Unit Tests: exportWeldLog Utility
 *
 * Tests that exportWeldLogToExcel correctly:
 * - Generates Excel file with correct data
 * - Formats columns properly
 * - Handles empty welds list
 * - Handles null values
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportWeldLogToExcel } from './exportWeldLog';
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds';
import * as XLSX from 'xlsx';

// Mock XLSX
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({
      '!ref': 'A1:L3',
    })),
    encode_cell: vi.fn((cell) => `${String.fromCharCode(65 + cell.c)}${cell.r + 1}`),
    decode_range: vi.fn(() => ({
      s: { r: 0, c: 0 },
      e: { r: 2, c: 11 },
    })),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe('exportWeldLogToExcel', () => {
  const mockWeld: EnrichedFieldWeld = {
    id: '1',
    component_id: 'comp-1',
    project_id: 'proj-1',
    weld_type: 'BW',
    weld_size: '2"',
    schedule: 'STD',
    base_metal: 'CS',
    spec: 'B31.3',
    welder_id: 'welder-1',
    date_welded: '2025-01-15',
    nde_required: true,
    nde_type: 'RT',
    nde_result: 'PASS',
    nde_date: '2025-01-16',
    nde_notes: null,
    status: 'accepted',
    original_weld_id: null,
    is_repair: false,
    is_unplanned: false,
    notes: null,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-16T10:00:00Z',
    component: {
      id: 'comp-1',
      drawing_id: 'drawing-1',
      type: 'PIPE',
      identity_key: {},
      percent_complete: 85,
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
      stencil: 'W1',
      name: 'John Doe',
      status: 'verified',
    },
    area: {
      id: 'area-1',
      name: 'Area A',
      description: null,
    },
    system: {
      id: 'system-1',
      name: 'System 1',
      description: null,
    },
    test_package: {
      id: 'pkg-1',
      name: 'Package A',
      description: null,
    },
    identityDisplay: 'W-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports welds to Excel format', () => {
    exportWeldLogToExcel([mockWeld], 'Test Project');

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          'Weld ID': 'W-1',
          'Drawing': 'P-001',
          'Welder': 'W1 - John Doe',
          'Type': 'BW',
          'Status': 'accepted',
        }),
      ])
    );

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/Test Project_weld_log_\d{4}-\d{2}-\d{2}\.xlsx/)
    );
  });

  it('handles null welder', () => {
    const weldWithoutWelder = {
      ...mockWeld,
      welder: null,
    };

    exportWeldLogToExcel([weldWithoutWelder], 'Test Project');

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          'Welder': 'Not Assigned',
        }),
      ])
    );
  });

  it('handles null metadata fields', () => {
    const weldWithoutMetadata = {
      ...mockWeld,
      area: null,
      system: null,
      test_package: null,
      weld_size: null,
      nde_result: null,
    };

    exportWeldLogToExcel([weldWithoutMetadata], 'Test Project');

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          'Area': '-',
          'System': '-',
          'Test Package': '-',
          'Size': '-',
          'NDE Result': '-',
        }),
      ])
    );
  });

  it('converts progress percentage to decimal', () => {
    exportWeldLogToExcel([mockWeld], 'Test Project');

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          'Progress %': 0.85, // 85 / 100
        }),
      ])
    );
  });

  it('formats date_welded correctly', () => {
    exportWeldLogToExcel([mockWeld], 'Test Project');

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          'Date Welded': expect.stringMatching(/\d{1,2}\/\d{1,2}\/\d{4}/), // Locale date format
        }),
      ])
    );
  });

  it('handles null date_welded', () => {
    const weldWithoutDate = {
      ...mockWeld,
      date_welded: null,
    };

    exportWeldLogToExcel([weldWithoutDate], 'Test Project');

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          'Date Welded': '-',
        }),
      ])
    );
  });

  it('sanitizes project name in filename', () => {
    exportWeldLogToExcel([mockWeld], 'Test/Project:Name');

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/Test_Project_Name_weld_log_\d{4}-\d{2}-\d{2}\.xlsx/)
    );
  });
});
