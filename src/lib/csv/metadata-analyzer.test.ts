/**
 * Unit Tests: Metadata Analyzer
 *
 * Tests metadata discovery functionality:
 * - Unique value extraction from ParsedRow[]
 * - Existence checking via Supabase batch queries
 * - MetadataDiscovery[] generation with exists/recordId
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractUniqueMetadata,
  checkMetadataExistence,
  analyzeMetadata
} from './metadata-analyzer';
import type { ParsedRow, MetadataDiscovery, MetadataDiscoveryResult } from '@/types/csv-import.types';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      in: vi.fn(() => ({
        eq: vi.fn(() => ({
          then: vi.fn()
        }))
      }))
    }))
  }))
};

describe('extractUniqueMetadata', () => {
  it('should extract unique area values from rows', () => {
    const rows: ParsedRow[] = [
      { drawing: 'P-001', type: 'Spool', qty: 1, cmdtyCode: 'A', area: 'B-68', unmappedFields: {} },
      { drawing: 'P-002', type: 'Spool', qty: 1, cmdtyCode: 'B', area: 'B-68', unmappedFields: {} },
      { drawing: 'P-003', type: 'Spool', qty: 1, cmdtyCode: 'C', area: 'B-70', unmappedFields: {} }
    ];

    const result = extractUniqueMetadata(rows);

    expect(result.areas).toEqual(['B-68', 'B-70']);
    expect(result.areas).toHaveLength(2);
  });

  it('should extract unique system values from rows', () => {
    const rows: ParsedRow[] = [
      { drawing: 'P-001', type: 'Spool', qty: 1, cmdtyCode: 'A', system: 'HC-05', unmappedFields: {} },
      { drawing: 'P-002', type: 'Spool', qty: 1, cmdtyCode: 'B', system: 'HC-05', unmappedFields: {} },
      { drawing: 'P-003', type: 'Spool', qty: 1, cmdtyCode: 'C', system: 'HC-06', unmappedFields: {} }
    ];

    const result = extractUniqueMetadata(rows);

    expect(result.systems).toEqual(['HC-05', 'HC-06']);
    expect(result.systems).toHaveLength(2);
  });

  it('should extract unique test package values from rows', () => {
    const rows: ParsedRow[] = [
      { drawing: 'P-001', type: 'Spool', qty: 1, cmdtyCode: 'A', testPackage: 'PKG-01', unmappedFields: {} },
      { drawing: 'P-002', type: 'Spool', qty: 1, cmdtyCode: 'B', testPackage: 'PKG-01', unmappedFields: {} },
      { drawing: 'P-003', type: 'Spool', qty: 1, cmdtyCode: 'C', testPackage: 'PKG-02', unmappedFields: {} }
    ];

    const result = extractUniqueMetadata(rows);

    expect(result.testPackages).toEqual(['PKG-01', 'PKG-02']);
    expect(result.testPackages).toHaveLength(2);
  });

  it('should filter out undefined/empty metadata values', () => {
    const rows: ParsedRow[] = [
      { drawing: 'P-001', type: 'Spool', qty: 1, cmdtyCode: 'A', area: 'B-68', unmappedFields: {} },
      { drawing: 'P-002', type: 'Spool', qty: 1, cmdtyCode: 'B', unmappedFields: {} }, // no area
      { drawing: 'P-003', type: 'Spool', qty: 1, cmdtyCode: 'C', area: '', unmappedFields: {} } // empty area
    ];

    const result = extractUniqueMetadata(rows);

    expect(result.areas).toEqual(['B-68']);
    expect(result.areas).toHaveLength(1);
  });

  it('should return empty arrays when no metadata present', () => {
    const rows: ParsedRow[] = [
      { drawing: 'P-001', type: 'Spool', qty: 1, cmdtyCode: 'A', unmappedFields: {} },
      { drawing: 'P-002', type: 'Spool', qty: 1, cmdtyCode: 'B', unmappedFields: {} }
    ];

    const result = extractUniqueMetadata(rows);

    expect(result.areas).toEqual([]);
    expect(result.systems).toEqual([]);
    expect(result.testPackages).toEqual([]);
  });

  it('should extract all three metadata types simultaneously', () => {
    const rows: ParsedRow[] = [
      {
        drawing: 'P-001',
        type: 'Spool',
        qty: 1,
        cmdtyCode: 'A',
        area: 'B-68',
        system: 'HC-05',
        testPackage: 'PKG-01',
        unmappedFields: {}
      },
      {
        drawing: 'P-002',
        type: 'Spool',
        qty: 1,
        cmdtyCode: 'B',
        area: 'B-70',
        system: 'HC-06',
        testPackage: 'PKG-02',
        unmappedFields: {}
      }
    ];

    const result = extractUniqueMetadata(rows);

    expect(result.areas).toEqual(['B-68', 'B-70']);
    expect(result.systems).toEqual(['HC-05', 'HC-06']);
    expect(result.testPackages).toEqual(['PKG-01', 'PKG-02']);
  });

  it('should maintain Set semantics (no duplicates, undefined order)', () => {
    const rows: ParsedRow[] = [
      { drawing: 'P-001', type: 'Spool', qty: 1, cmdtyCode: 'A', area: 'B-68', unmappedFields: {} },
      { drawing: 'P-002', type: 'Spool', qty: 1, cmdtyCode: 'B', area: 'B-68', unmappedFields: {} },
      { drawing: 'P-003', type: 'Spool', qty: 1, cmdtyCode: 'C', area: 'B-68', unmappedFields: {} }
    ];

    const result = extractUniqueMetadata(rows);

    expect(result.areas).toEqual(['B-68']);
    expect(result.areas).toHaveLength(1);
  });
});

describe('checkMetadataExistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query areas table with batch .in() clause', async () => {
    const uniqueValues = {
      areas: ['B-68', 'B-70'],
      systems: [],
      testPackages: []
    };

    const mockData = [
      { id: 'area-1', name: 'B-68' }
    ];

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }))
    };

    const result = await checkMetadataExistence(
      mockSupabase as any,
      'project-123',
      uniqueValues
    );

    expect(mockSupabase.from).toHaveBeenCalledWith('areas');
    expect(result.areas).toHaveLength(2);
    expect(result.areas[0]).toMatchObject({
      type: 'area',
      value: 'B-68',
      exists: true,
      recordId: 'area-1'
    });
    expect(result.areas[1]).toMatchObject({
      type: 'area',
      value: 'B-70',
      exists: false,
      recordId: null
    });
  });

  it('should query systems table with batch .in() clause', async () => {
    const uniqueValues = {
      areas: [],
      systems: ['HC-05', 'HC-06'],
      testPackages: []
    };

    const mockData = [
      { id: 'system-1', name: 'HC-05' },
      { id: 'system-2', name: 'HC-06' }
    ];

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }))
    };

    const result = await checkMetadataExistence(
      mockSupabase as any,
      'project-123',
      uniqueValues
    );

    expect(mockSupabase.from).toHaveBeenCalledWith('systems');
    expect(result.systems).toHaveLength(2);
    expect(result.systems[0]).toMatchObject({
      type: 'system',
      value: 'HC-05',
      exists: true,
      recordId: 'system-1'
    });
  });

  it('should query test_packages table with batch .in() clause', async () => {
    const uniqueValues = {
      areas: [],
      systems: [],
      testPackages: ['PKG-01']
    };

    const mockData = [];

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      }))
    };

    const result = await checkMetadataExistence(
      mockSupabase as any,
      'project-123',
      uniqueValues
    );

    expect(mockSupabase.from).toHaveBeenCalledWith('test_packages');
    expect(result.testPackages).toHaveLength(1);
    expect(result.testPackages[0]).toMatchObject({
      type: 'test_package',
      value: 'PKG-01',
      exists: false,
      recordId: null
    });
  });

  it('should respect project_id filter via .eq() clause', async () => {
    const uniqueValues = {
      areas: ['B-68'],
      systems: [],
      testPackages: []
    };

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            eq: vi.fn((field: string, value: string) => {
              expect(field).toBe('project_id');
              expect(value).toBe('project-123');
              return Promise.resolve({ data: [], error: null });
            })
          }))
        }))
      }))
    };

    await checkMetadataExistence(
      mockSupabase as any,
      'project-123',
      uniqueValues
    );
  });

  it('should handle empty unique values (no queries)', async () => {
    const uniqueValues = {
      areas: [],
      systems: [],
      testPackages: []
    };

    const mockSupabase = {
      from: vi.fn()
    };

    const result = await checkMetadataExistence(
      mockSupabase as any,
      'project-123',
      uniqueValues
    );

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(result.areas).toEqual([]);
    expect(result.systems).toEqual([]);
    expect(result.testPackages).toEqual([]);
  });

  it('should handle Supabase query errors gracefully', async () => {
    const uniqueValues = {
      areas: ['B-68'],
      systems: [],
      testPackages: []
    };

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      }))
    };

    await expect(
      checkMetadataExistence(mockSupabase as any, 'project-123', uniqueValues)
    ).rejects.toThrow('Failed to check metadata existence for areas');
  });
});

describe('analyzeMetadata', () => {
  it('should combine extraction and existence check', async () => {
    const rows: ParsedRow[] = [
      {
        drawing: 'P-001',
        type: 'Spool',
        qty: 1,
        cmdtyCode: 'A',
        area: 'B-68',
        system: 'HC-05',
        unmappedFields: {}
      },
      {
        drawing: 'P-002',
        type: 'Spool',
        qty: 1,
        cmdtyCode: 'B',
        area: 'B-70',
        system: 'HC-06',
        unmappedFields: {}
      }
    ];

    const mockData = [
      { id: 'area-1', name: 'B-68' },
      { id: 'system-1', name: 'HC-05' }
    ];

    const mockSupabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            eq: vi.fn(() => {
              if (table === 'areas') {
                return Promise.resolve({ data: [mockData[0]], error: null });
              } else if (table === 'systems') {
                return Promise.resolve({ data: [mockData[1]], error: null });
              }
              return Promise.resolve({ data: [], error: null });
            })
          }))
        }))
      }))
    };

    const result = await analyzeMetadata(
      mockSupabase as any,
      'project-123',
      rows
    );

    expect(result.areas).toHaveLength(2);
    expect(result.systems).toHaveLength(2);
    expect(result.totalCount).toBe(4);
    expect(result.existingCount).toBe(2);
    expect(result.willCreateCount).toBe(2);
  });

  it('should calculate totalCount, existingCount, willCreateCount correctly', async () => {
    const rows: ParsedRow[] = [
      { drawing: 'P-001', type: 'Spool', qty: 1, cmdtyCode: 'A', area: 'B-68', unmappedFields: {} }
    ];

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              data: [{ id: 'area-1', name: 'B-68' }],
              error: null
            }))
          }))
        }))
      }))
    };

    const result = await analyzeMetadata(
      mockSupabase as any,
      'project-123',
      rows
    );

    expect(result.totalCount).toBe(1);
    expect(result.existingCount).toBe(1);
    expect(result.willCreateCount).toBe(0);
  });

  it('should return empty result for rows without metadata', async () => {
    const rows: ParsedRow[] = [
      { drawing: 'P-001', type: 'Spool', qty: 1, cmdtyCode: 'A', unmappedFields: {} }
    ];

    const mockSupabase = {
      from: vi.fn()
    };

    const result = await analyzeMetadata(
      mockSupabase as any,
      'project-123',
      rows
    );

    expect(result.totalCount).toBe(0);
    expect(result.existingCount).toBe(0);
    expect(result.willCreateCount).toBe(0);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});
