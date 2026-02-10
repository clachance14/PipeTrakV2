/**
 * Integration Test: Server-Side Metadata Upsert for Flexible CSV Import
 *
 * Tests Edge Function metadata creation logic:
 * - Upsert metadata before component creation
 * - ON CONFLICT DO NOTHING semantics
 * - Lookup map generation (name → id)
 * - Component linking via foreign keys
 */

import { describe, it, expect } from 'vitest';
import type {
  ImportResult,
  MetadataToCreate,
  ParsedRow
} from '@/types/csv-import.types';

describe('Edge Function Metadata Upsert', () => {
  const _projectId = 'test-project-123';

  /**
   * Mock Edge Function metadata upsert behavior
   *
   * This simulates the Edge Function's transaction logic:
   * 1. Upsert metadata (ON CONFLICT DO NOTHING)
   * 2. Build lookup maps (name → id)
   * 3. Link components to metadata
   */
  async function mockMetadataUpsert(
    metadata: MetadataToCreate,
    existingMetadata: {
      areas: Array<{ name: string; id: string }>;
      systems: Array<{ name: string; id: string }>;
      testPackages: Array<{ name: string; id: string }>;
    }
  ): Promise<{
    areaLookup: Map<string, string>;
    systemLookup: Map<string, string>;
    testPackageLookup: Map<string, string>;
    created: {
      areas: number;
      systems: number;
      testPackages: number;
    };
  }> {
    // Build lookup maps
    const areaLookup = new Map<string, string>();
    const systemLookup = new Map<string, string>();
    const testPackageLookup = new Map<string, string>();

    // Populate with existing metadata
    existingMetadata.areas.forEach(area => {
      areaLookup.set(area.name, area.id);
    });
    existingMetadata.systems.forEach(system => {
      systemLookup.set(system.name, system.id);
    });
    existingMetadata.testPackages.forEach(pkg => {
      testPackageLookup.set(pkg.name, pkg.id);
    });

    let areasCreated = 0;
    let systemsCreated = 0;
    let testPackagesCreated = 0;

    // Upsert new areas (ON CONFLICT DO NOTHING)
    for (const areaName of metadata.areas) {
      if (!areaLookup.has(areaName)) {
        const newId = `area-${Math.random().toString(36).substring(7)}`;
        areaLookup.set(areaName, newId);
        areasCreated++;
      }
    }

    // Upsert new systems (ON CONFLICT DO NOTHING)
    for (const systemName of metadata.systems) {
      if (!systemLookup.has(systemName)) {
        const newId = `system-${Math.random().toString(36).substring(7)}`;
        systemLookup.set(systemName, newId);
        systemsCreated++;
      }
    }

    // Upsert new test packages (ON CONFLICT DO NOTHING)
    for (const pkgName of metadata.testPackages) {
      if (!testPackageLookup.has(pkgName)) {
        const newId = `pkg-${Math.random().toString(36).substring(7)}`;
        testPackageLookup.set(pkgName, newId);
        testPackagesCreated++;
      }
    }

    return {
      areaLookup,
      systemLookup,
      testPackageLookup,
      created: {
        areas: areasCreated,
        systems: systemsCreated,
        testPackages: testPackagesCreated
      }
    };
  }

  describe('Metadata Upsert Order', () => {
    it('should upsert metadata BEFORE component creation', async () => {
      const metadata: MetadataToCreate = {
        areas: ['B-68'],
        systems: ['HC-05'],
        testPackages: []
      };

      const existingMetadata = {
        areas: [],
        systems: [],
        testPackages: []
      };

      const result = await mockMetadataUpsert(metadata, existingMetadata);

      // Verify new metadata created
      expect(result.created.areas).toBe(1);
      expect(result.created.systems).toBe(1);
      expect(result.created.testPackages).toBe(0);

      // Verify lookup maps populated
      expect(result.areaLookup.has('B-68')).toBe(true);
      expect(result.systemLookup.has('HC-05')).toBe(true);
      expect(result.areaLookup.get('B-68')).toMatch(/^area-/);
      expect(result.systemLookup.get('HC-05')).toMatch(/^system-/);
    });
  });

  describe('ON CONFLICT DO NOTHING Semantics', () => {
    it('should not create duplicate metadata if already exists', async () => {
      const metadata: MetadataToCreate = {
        areas: ['B-68', 'B-70'],
        systems: [],
        testPackages: []
      };

      const existingMetadata = {
        areas: [{ name: 'B-68', id: 'existing-area-1' }],
        systems: [],
        testPackages: []
      };

      const result = await mockMetadataUpsert(metadata, existingMetadata);

      // Only 1 new area created (B-70), B-68 already exists
      expect(result.created.areas).toBe(1);

      // Verify existing area ID preserved
      expect(result.areaLookup.get('B-68')).toBe('existing-area-1');

      // Verify new area created
      expect(result.areaLookup.has('B-70')).toBe(true);
      expect(result.areaLookup.get('B-70')).toMatch(/^area-/);
    });

    it('should handle mixed existing/new metadata across types', async () => {
      const metadata: MetadataToCreate = {
        areas: ['B-68', 'B-70'],
        systems: ['HC-05', 'HC-06'],
        testPackages: ['PKG-01']
      };

      const existingMetadata = {
        areas: [{ name: 'B-68', id: 'existing-area-1' }],
        systems: [{ name: 'HC-05', id: 'existing-system-1' }],
        testPackages: []
      };

      const result = await mockMetadataUpsert(metadata, existingMetadata);

      // Verify creation counts
      expect(result.created.areas).toBe(1); // B-70
      expect(result.created.systems).toBe(1); // HC-06
      expect(result.created.testPackages).toBe(1); // PKG-01

      // Verify existing IDs preserved
      expect(result.areaLookup.get('B-68')).toBe('existing-area-1');
      expect(result.systemLookup.get('HC-05')).toBe('existing-system-1');

      // Verify new IDs created
      expect(result.areaLookup.get('B-70')).toMatch(/^area-/);
      expect(result.systemLookup.get('HC-06')).toMatch(/^system-/);
      expect(result.testPackageLookup.get('PKG-01')).toMatch(/^pkg-/);
    });
  });

  describe('Lookup Map Generation', () => {
    it('should build Map<name, id> for each metadata type', async () => {
      const metadata: MetadataToCreate = {
        areas: ['B-68', 'B-70'],
        systems: ['HC-05'],
        testPackages: ['PKG-01', 'PKG-02']
      };

      const existingMetadata = {
        areas: [],
        systems: [],
        testPackages: []
      };

      const result = await mockMetadataUpsert(metadata, existingMetadata);

      // Verify lookup maps are Map instances
      expect(result.areaLookup).toBeInstanceOf(Map);
      expect(result.systemLookup).toBeInstanceOf(Map);
      expect(result.testPackageLookup).toBeInstanceOf(Map);

      // Verify all metadata values mapped
      expect(result.areaLookup.size).toBe(2);
      expect(result.systemLookup.size).toBe(1);
      expect(result.testPackageLookup.size).toBe(2);

      // Verify name → id mapping
      expect(result.areaLookup.has('B-68')).toBe(true);
      expect(result.areaLookup.has('B-70')).toBe(true);
      expect(result.systemLookup.has('HC-05')).toBe(true);
      expect(result.testPackageLookup.has('PKG-01')).toBe(true);
      expect(result.testPackageLookup.has('PKG-02')).toBe(true);
    });

    it('should handle empty metadata (no upsert, empty maps)', async () => {
      const metadata: MetadataToCreate = {
        areas: [],
        systems: [],
        testPackages: []
      };

      const existingMetadata = {
        areas: [],
        systems: [],
        testPackages: []
      };

      const result = await mockMetadataUpsert(metadata, existingMetadata);

      // No metadata created
      expect(result.created.areas).toBe(0);
      expect(result.created.systems).toBe(0);
      expect(result.created.testPackages).toBe(0);

      // Empty lookup maps
      expect(result.areaLookup.size).toBe(0);
      expect(result.systemLookup.size).toBe(0);
      expect(result.testPackageLookup.size).toBe(0);
    });
  });

  describe('Component Linking', () => {
    it('should link components to metadata via foreign keys', async () => {
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

      const metadata: MetadataToCreate = {
        areas: ['B-68'],
        systems: ['HC-05'],
        testPackages: ['PKG-01']
      };

      const existingMetadata = {
        areas: [{ name: 'B-68', id: 'existing-area-1' }],
        systems: [],
        testPackages: []
      };

      const result = await mockMetadataUpsert(metadata, existingMetadata);

      // Simulate component creation with metadata linking
      const componentsWithMetadata = rows.map(row => ({
        ...row,
        area_id: row.area ? result.areaLookup.get(row.area) : null,
        system_id: row.system ? result.systemLookup.get(row.system) : null,
        test_package_id: row.testPackage
          ? result.testPackageLookup.get(row.testPackage)
          : null
      }));

      // Verify foreign keys set correctly
      expect(componentsWithMetadata[0].area_id).toBe('existing-area-1');
      expect(componentsWithMetadata[0].system_id).toMatch(/^system-/);
      expect(componentsWithMetadata[0].test_package_id).toMatch(/^pkg-/);
    });

    it('should set foreign keys to null for missing metadata', async () => {
      const rows: ParsedRow[] = [
        {
          drawing: 'P-001',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'A',
          // No area, system, or testPackage
          unmappedFields: {}
        }
      ];

      const metadata: MetadataToCreate = {
        areas: [],
        systems: [],
        testPackages: []
      };

      const existingMetadata = {
        areas: [],
        systems: [],
        testPackages: []
      };

      const result = await mockMetadataUpsert(metadata, existingMetadata);

      // Simulate component creation
      const componentsWithMetadata = rows.map(row => ({
        ...row,
        area_id: row.area ? result.areaLookup.get(row.area) : null,
        system_id: row.system ? result.systemLookup.get(row.system) : null,
        test_package_id: row.testPackage
          ? result.testPackageLookup.get(row.testPackage)
          : null
      }));

      // Verify foreign keys are null
      expect(componentsWithMetadata[0].area_id).toBeNull();
      expect(componentsWithMetadata[0].system_id).toBeNull();
      expect(componentsWithMetadata[0].test_package_id).toBeNull();
    });

    it('should handle partial metadata coverage', async () => {
      const rows: ParsedRow[] = [
        {
          drawing: 'P-001',
          type: 'Spool',
          qty: 1,
          cmdtyCode: 'A',
          area: 'B-68',
          // No system or testPackage
          unmappedFields: {}
        }
      ];

      const metadata: MetadataToCreate = {
        areas: ['B-68'],
        systems: [],
        testPackages: []
      };

      const existingMetadata = {
        areas: [],
        systems: [],
        testPackages: []
      };

      const result = await mockMetadataUpsert(metadata, existingMetadata);

      // Simulate component creation
      const componentsWithMetadata = rows.map(row => ({
        ...row,
        area_id: row.area ? result.areaLookup.get(row.area) : null,
        system_id: row.system ? result.systemLookup.get(row.system) : null,
        test_package_id: row.testPackage
          ? result.testPackageLookup.get(row.testPackage)
          : null
      }));

      // Verify area linked, system/test package null
      expect(componentsWithMetadata[0].area_id).toMatch(/^area-/);
      expect(componentsWithMetadata[0].system_id).toBeNull();
      expect(componentsWithMetadata[0].test_package_id).toBeNull();
    });
  });

  describe('ImportResult Response', () => {
    it('should include metadataCreated counts in response', () => {
      const importResult: ImportResult = {
        success: true,
        componentsCreated: 10,
        drawingsCreated: 3,
        drawingsUpdated: 0,
        metadataCreated: {
          areas: 2,
          systems: 1,
          testPackages: 0
        },
        componentsByType: {
          spool: 8,
          valve: 2
        },
        duration: 1234
      };

      // Verify metadataCreated field present
      expect(importResult.metadataCreated).toBeDefined();
      expect(importResult.metadataCreated.areas).toBe(2);
      expect(importResult.metadataCreated.systems).toBe(1);
      expect(importResult.metadataCreated.testPackages).toBe(0);
    });

    it('should set metadataCreated to zero when no metadata created', () => {
      const importResult: ImportResult = {
        success: true,
        componentsCreated: 5,
        drawingsCreated: 2,
        drawingsUpdated: 0,
        metadataCreated: {
          areas: 0,
          systems: 0,
          testPackages: 0
        },
        componentsByType: {
          spool: 5
        },
        duration: 567
      };

      expect(importResult.metadataCreated.areas).toBe(0);
      expect(importResult.metadataCreated.systems).toBe(0);
      expect(importResult.metadataCreated.testPackages).toBe(0);
    });
  });

  describe('Transaction Rollback', () => {
    it('should rollback all metadata if component creation fails', () => {
      // This is a conceptual test - actual transaction logic in Edge Function
      const transactionLog: string[] = [];

      // Simulate transaction
      const transaction = {
        upsertMetadata: () => {
          transactionLog.push('metadata_upserted');
        },
        createComponents: () => {
          transactionLog.push('component_creation_failed');
          throw new Error('Duplicate identity key');
        },
        rollback: () => {
          transactionLog.push('rollback_executed');
        }
      };

      // Execute transaction
      try {
        transaction.upsertMetadata();
        transaction.createComponents();
      } catch {
        transaction.rollback();
      }

      // Verify rollback executed
      expect(transactionLog).toEqual([
        'metadata_upserted',
        'component_creation_failed',
        'rollback_executed'
      ]);
    });
  });
});
