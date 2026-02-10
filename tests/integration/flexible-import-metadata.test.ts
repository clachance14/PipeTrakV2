/**
 * Integration Test: Metadata Discovery for Flexible CSV Import
 *
 * Tests metadata analysis with real Supabase queries (mocked):
 * - Extraction of unique values from ParsedRow[]
 * - Batch existence checking via Supabase
 * - MetadataDiscoveryResult generation
 */

import { describe, it, expect, vi } from 'vitest';
import { analyzeMetadata } from '@/lib/csv/metadata-analyzer';
import type { ParsedRow } from '@/types/csv-import.types';

describe('Metadata Discovery Integration', () => {
  const projectId = 'test-project-123';

  // Mock Supabase client factory
  const createMockSupabase = (mockData: {
    areas?: Array<{ id: string; name: string }>;
    systems?: Array<{ id: string; name: string }>;
    testPackages?: Array<{ id: string; name: string }>;
  }) => {
    return {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            eq: vi.fn(() => {
              let data = null;
              if (table === 'areas') {
                data = mockData.areas || [];
              } else if (table === 'systems') {
                data = mockData.systems || [];
              } else if (table === 'test_packages') {
                data = mockData.testPackages || [];
              }
              return Promise.resolve({ data, error: null });
            })
          }))
        }))
      }))
    };
  };

  describe('Complete Metadata Workflow', () => {
    it('should extract, check existence, and generate MetadataDiscoveryResult', async () => {
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
          area: 'B-68', // Duplicate (should be deduplicated)
          system: 'HC-06', // New system
          testPackage: 'PKG-02', // New package
          unmappedFields: {}
        },
        {
          drawing: 'P-003',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'C',
          area: 'B-70', // New area
          unmappedFields: {}
        }
      ];

      // Mock: B-68 exists, HC-05 exists, PKG-01 exists
      const mockSupabase = createMockSupabase({
        areas: [{ id: 'area-1', name: 'B-68' }],
        systems: [{ id: 'system-1', name: 'HC-05' }],
        testPackages: [{ id: 'pkg-1', name: 'PKG-01' }]
      });

      const result = await analyzeMetadata(
        mockSupabase as any,
        projectId,
        rows
      );

      // Verify counts
      expect(result.totalCount).toBe(6); // 2 areas, 2 systems, 2 packages
      expect(result.existingCount).toBe(3); // B-68, HC-05, PKG-01
      expect(result.willCreateCount).toBe(3); // B-70, HC-06, PKG-02

      // Verify areas
      expect(result.areas).toHaveLength(2);
      expect(result.areas).toContainEqual({
        type: 'area',
        value: 'B-68',
        exists: true,
        recordId: 'area-1'
      });
      expect(result.areas).toContainEqual({
        type: 'area',
        value: 'B-70',
        exists: false,
        recordId: null
      });

      // Verify systems
      expect(result.systems).toHaveLength(2);
      expect(result.systems).toContainEqual({
        type: 'system',
        value: 'HC-05',
        exists: true,
        recordId: 'system-1'
      });
      expect(result.systems).toContainEqual({
        type: 'system',
        value: 'HC-06',
        exists: false,
        recordId: null
      });

      // Verify test packages
      expect(result.testPackages).toHaveLength(2);
      expect(result.testPackages).toContainEqual({
        type: 'test_package',
        value: 'PKG-01',
        exists: true,
        recordId: 'pkg-1'
      });
      expect(result.testPackages).toContainEqual({
        type: 'test_package',
        value: 'PKG-02',
        exists: false,
        recordId: null
      });
    });

    it('should handle CSV with no metadata (all fields empty)', async () => {
      const rows: ParsedRow[] = [
        {
          drawing: 'P-001',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'A',
          unmappedFields: {}
        },
        {
          drawing: 'P-002',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'B',
          unmappedFields: {}
        }
      ];

      const mockSupabase = createMockSupabase({});

      const result = await analyzeMetadata(
        mockSupabase as any,
        projectId,
        rows
      );

      expect(result.totalCount).toBe(0);
      expect(result.existingCount).toBe(0);
      expect(result.willCreateCount).toBe(0);
      expect(result.areas).toEqual([]);
      expect(result.systems).toEqual([]);
      expect(result.testPackages).toEqual([]);

      // Should not make any database queries
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle CSV where all metadata already exists', async () => {
      const rows: ParsedRow[] = [
        {
          drawing: 'P-001',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'A',
          area: 'B-68',
          system: 'HC-05',
          unmappedFields: {}
        }
      ];

      const mockSupabase = createMockSupabase({
        areas: [{ id: 'area-1', name: 'B-68' }],
        systems: [{ id: 'system-1', name: 'HC-05' }]
      });

      const result = await analyzeMetadata(
        mockSupabase as any,
        projectId,
        rows
      );

      expect(result.totalCount).toBe(2);
      expect(result.existingCount).toBe(2);
      expect(result.willCreateCount).toBe(0);

      // All metadata should have exists=true
      expect(result.areas.every(a => a.exists)).toBe(true);
      expect(result.systems.every(s => s.exists)).toBe(true);
    });

    it('should handle CSV where no metadata exists (all new)', async () => {
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
        }
      ];

      const mockSupabase = createMockSupabase({
        areas: [],
        systems: [],
        testPackages: []
      });

      const result = await analyzeMetadata(
        mockSupabase as any,
        projectId,
        rows
      );

      expect(result.totalCount).toBe(3);
      expect(result.existingCount).toBe(0);
      expect(result.willCreateCount).toBe(3);

      // All metadata should have exists=false, recordId=null
      expect(result.areas.every(a => !a.exists && a.recordId === null)).toBe(true);
      expect(result.systems.every(s => !s.exists && s.recordId === null)).toBe(true);
      expect(result.testPackages.every(p => !p.exists && p.recordId === null)).toBe(true);
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate metadata values across multiple rows', async () => {
      const rows: ParsedRow[] = [
        {
          drawing: 'P-001',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'A',
          area: 'B-68',
          unmappedFields: {}
        },
        {
          drawing: 'P-002',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'B',
          area: 'B-68', // Same area
          unmappedFields: {}
        },
        {
          drawing: 'P-003',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'C',
          area: 'B-68', // Same area
          unmappedFields: {}
        }
      ];

      const mockSupabase = createMockSupabase({
        areas: []
      });

      const result = await analyzeMetadata(
        mockSupabase as any,
        projectId,
        rows
      );

      // Should only have 1 unique area
      expect(result.areas).toHaveLength(1);
      expect(result.areas[0].value).toBe('B-68');
      expect(result.totalCount).toBe(1);
    });
  });

  describe('Batch Query Verification', () => {
    it('should use .in() clause for batch queries (not individual queries)', async () => {
      const rows: ParsedRow[] = [
        {
          drawing: 'P-001',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'A',
          area: 'B-68',
          unmappedFields: {}
        },
        {
          drawing: 'P-002',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'B',
          area: 'B-70',
          unmappedFields: {}
        }
      ];

      const mockSupabase = createMockSupabase({
        areas: [{ id: 'area-1', name: 'B-68' }]
      });

      await analyzeMetadata(mockSupabase as any, projectId, rows);

      // Should only call .from('areas') once (batch query)
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('areas');
    });

    it('should respect project_id filter in queries', async () => {
      const rows: ParsedRow[] = [
        {
          drawing: 'P-001',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'A',
          area: 'B-68',
          unmappedFields: {}
        }
      ];

      const eqSpy = vi.fn(() => Promise.resolve({ data: [], error: null }));

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: eqSpy
            }))
          }))
        }))
      };

      await analyzeMetadata(mockSupabase as any, projectId, rows);

      // Verify .eq('project_id', projectId) was called
      expect(eqSpy).toHaveBeenCalledWith('project_id', projectId);
    });
  });

  describe('Error Handling', () => {
    it('should throw on Supabase query error', async () => {
      const rows: ParsedRow[] = [
        {
          drawing: 'P-001',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'A',
          area: 'B-68',
          unmappedFields: {}
        }
      ];

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Database connection failed' }
              }))
            }))
          }))
        }))
      };

      await expect(
        analyzeMetadata(mockSupabase as any, projectId, rows)
      ).rejects.toThrow('Failed to check metadata existence for areas');
    });
  });

  describe('Partial Metadata Coverage', () => {
    it('should handle rows with only area metadata', async () => {
      const rows: ParsedRow[] = [
        {
          drawing: 'P-001',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'A',
          area: 'B-68',
          unmappedFields: {}
        }
      ];

      const mockSupabase = createMockSupabase({
        areas: [{ id: 'area-1', name: 'B-68' }]
      });

      const result = await analyzeMetadata(
        mockSupabase as any,
        projectId,
        rows
      );

      expect(result.areas).toHaveLength(1);
      expect(result.systems).toHaveLength(0);
      expect(result.testPackages).toHaveLength(0);
      expect(result.totalCount).toBe(1);
    });

    it('should handle rows with only system metadata', async () => {
      const rows: ParsedRow[] = [
        {
          drawing: 'P-001',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'A',
          system: 'HC-05',
          unmappedFields: {}
        }
      ];

      const mockSupabase = createMockSupabase({
        systems: []
      });

      const result = await analyzeMetadata(
        mockSupabase as any,
        projectId,
        rows
      );

      expect(result.areas).toHaveLength(0);
      expect(result.systems).toHaveLength(1);
      expect(result.testPackages).toHaveLength(0);
      expect(result.totalCount).toBe(1);
    });

    it('should handle rows with mixed metadata coverage', async () => {
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
          // No system or test package
          unmappedFields: {}
        },
        {
          drawing: 'P-003',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'C',
          testPackage: 'PKG-01',
          // No area or system
          unmappedFields: {}
        }
      ];

      const mockSupabase = createMockSupabase({
        areas: [],
        systems: [],
        testPackages: []
      });

      const result = await analyzeMetadata(
        mockSupabase as any,
        projectId,
        rows
      );

      expect(result.areas).toHaveLength(2); // B-68, B-70
      expect(result.systems).toHaveLength(1); // HC-05
      expect(result.testPackages).toHaveLength(1); // PKG-01
      expect(result.totalCount).toBe(4);
    });
  });
});
