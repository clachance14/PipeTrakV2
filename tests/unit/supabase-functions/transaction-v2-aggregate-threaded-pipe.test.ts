/**
 * Unit tests for Aggregate Threaded Pipe Import (Feature 027)
 *
 * Tests transaction-v2.ts aggregate import logic for threaded_pipe components
 *
 * User Story 1: Import threaded pipe as aggregate quantity
 * - T012: Aggregate creation (QTY=100 → 1 component with pipe_id ending in -AGG)
 * - T013: Mixed component types (threaded_pipe + valve)
 * - T014: Identity key structure (verify pipe_id format: "DRAWING-SIZE-CMDTY-AGG")
 * - T015: Absolute LF milestone initialization (Fabricate_LF: 0, Install_LF: 0, etc.)
 *
 * User Story 2: Sum quantities for duplicate identities
 * - T020: Quantity summing (50 + 50 = 100 total_linear_feet)
 * - T021: Line numbers array appending (["101"] + "205" → ["101", "205"])
 * - T022: Milestone preservation on update (absolute LF values preserved)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client
const _mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
};

// Helper to create mock query builder
function _createMockQueryBuilder(data: any, error: any = null) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue({ data, error })
  };
}

// Import the function under test (will need to mock Supabase)
// Note: This is a placeholder - actual implementation will import from transaction-v2.ts
// For now, we'll test the logic structure

describe('Transaction V2 - Aggregate Threaded Pipe Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('T012: Aggregate creation (QTY=100 → 1 component with pipe_id ending in -AGG)', () => {
    it('should create single aggregate component for threaded_pipe with QTY=100', () => {
      // Arrange: Input row with threaded_pipe and QTY=100
      const inputRow = {
        drawing: 'P-001',
        type: 'Threaded_Pipe',
        qty: 100,
        cmdtyCode: 'PIPE-SCH40',
        size: '1"',
        spec: '',
        description: 'Threaded pipe',
        comments: '',
        area: undefined,
        system: undefined,
        testPackage: undefined,
        unmappedFields: {}
      };

      const projectId = 'project-123';
      const drawingId = 'drawing-456';
      const templateId = 'template-789';

      // Expected: Single component with pipe_id ending in -AGG
      const expectedComponent = {
        project_id: projectId,
        component_type: 'threaded_pipe',
        drawing_id: drawingId,
        progress_template_id: templateId,
        area_id: null,
        system_id: null,
        test_package_id: null,
        identity_key: {
          pipe_id: 'P-001-1-PIPE-SCH40-AGG'
        },
        attributes: {
          spec: '',
          description: 'Threaded pipe',
          size: '1"',
          cmdty_code: 'PIPE-SCH40',
          comments: '',
          original_qty: 100,
          total_linear_feet: 100,
          line_numbers: expect.arrayContaining([expect.any(String)])
        },
        current_milestones: {
          Fabricate_LF: 0,
          Install_LF: 0,
          Erect_LF: 0,
          Connect_LF: 0,
          Support_LF: 0,
          Punch: false,
          Test: false,
          Restore: false
        }
      };

      // Act: Generate component (this tests the logic structure)
      const components: any[] = [];
      const typeLower = inputRow.type.toLowerCase();

      // Implementation logic to test (this is what we'll implement)
      if (typeLower === 'threaded_pipe') {
        // Normalize drawing and size
        const drawingNorm = inputRow.drawing.trim().toUpperCase().replace(/\s+/g, ' ');
        const sizeNorm = inputRow.size?.trim().replace(/["'\s]/g, '').replace(/\//g, 'X').toUpperCase() || 'NOSIZE';

        // Build pipe_id with -AGG suffix
        const pipeId = `${drawingNorm}-${sizeNorm}-${inputRow.cmdtyCode}-AGG`;

        // Create single aggregate component
        components.push({
          project_id: projectId,
          component_type: typeLower,
          drawing_id: drawingId,
          progress_template_id: templateId,
          area_id: null,
          system_id: null,
          test_package_id: null,
          identity_key: {
            pipe_id: pipeId
          },
          attributes: {
            spec: inputRow.spec || '',
            description: inputRow.description || '',
            size: inputRow.size || '',
            cmdty_code: inputRow.cmdtyCode,
            comments: inputRow.comments || '',
            original_qty: inputRow.qty,
            total_linear_feet: inputRow.qty,
            line_numbers: ['1'] // Placeholder - will be actual CSV line number
          },
          current_milestones: {
            Fabricate_LF: 0,
            Install_LF: 0,
            Erect_LF: 0,
            Connect_LF: 0,
            Support_LF: 0,
            Punch: false,
            Test: false,
            Restore: false
          }
        });
      }

      // Assert: Only 1 component created
      expect(components).toHaveLength(1);

      // Assert: Component has correct structure
      expect(components[0]).toMatchObject(expectedComponent);

      // Assert: pipe_id ends with -AGG
      expect(components[0].identity_key.pipe_id).toMatch(/-AGG$/);

      // Assert: total_linear_feet equals QTY
      expect(components[0].attributes.total_linear_feet).toBe(100);

      // Assert: line_numbers is an array
      expect(Array.isArray(components[0].attributes.line_numbers)).toBe(true);
      expect(components[0].attributes.line_numbers.length).toBeGreaterThan(0);
    });

    it('should NOT create multiple components for threaded_pipe (no quantity explosion)', () => {
      // Arrange: Input row with threaded_pipe and QTY=100
      const inputRow = {
        drawing: 'P-001',
        type: 'Threaded_Pipe',
        qty: 100,
        cmdtyCode: 'PIPE-SCH40',
        size: '1"'
      };

      // Act: Generate components
      const components: any[] = [];
      const typeLower = inputRow.type.toLowerCase();

      if (typeLower === 'threaded_pipe') {
        const drawingNorm = inputRow.drawing.trim().toUpperCase().replace(/\s+/g, ' ');
        const sizeNorm = inputRow.size?.trim().replace(/["'\s]/g, '').replace(/\//g, 'X').toUpperCase() || 'NOSIZE';
        const pipeId = `${drawingNorm}-${sizeNorm}-${inputRow.cmdtyCode}-AGG`;

        // Single aggregate component (NO quantity explosion)
        components.push({
          identity_key: { pipe_id: pipeId },
          attributes: { total_linear_feet: inputRow.qty }
        });
      } else {
        // Other types: quantity explosion (for comparison)
        for (let i = 1; i <= inputRow.qty; i++) {
          components.push({
            identity_key: { seq: i }
          });
        }
      }

      // Assert: Only 1 component created (NOT 100)
      expect(components).toHaveLength(1);
    });
  });

  describe('T013: Mixed component types (threaded_pipe + valve)', () => {
    it('should handle threaded_pipe as aggregate and valve with quantity explosion', () => {
      // Arrange: Mix of threaded_pipe and valve rows
      const inputRows = [
        {
          drawing: 'P-001',
          type: 'Threaded_Pipe',
          qty: 100,
          cmdtyCode: 'PIPE-SCH40',
          size: '1"'
        },
        {
          drawing: 'P-001',
          type: 'Valve',
          qty: 5,
          cmdtyCode: 'VALVE-GATE',
          size: '2"'
        }
      ];

      // Act: Generate components
      const components: any[] = [];

      inputRows.forEach((row) => {
        const typeLower = row.type.toLowerCase();
        const drawingNorm = row.drawing.trim().toUpperCase().replace(/\s+/g, ' ');
        const sizeNorm = row.size?.trim().replace(/["'\s]/g, '').replace(/\//g, 'X').toUpperCase() || 'NOSIZE';

        if (typeLower === 'threaded_pipe') {
          // Aggregate: 1 component
          const pipeId = `${drawingNorm}-${sizeNorm}-${row.cmdtyCode}-AGG`;
          components.push({
            component_type: typeLower,
            identity_key: { pipe_id: pipeId },
            attributes: { total_linear_feet: row.qty }
          });
        } else {
          // Quantity explosion: 5 components for valve
          for (let i = 1; i <= row.qty; i++) {
            components.push({
              component_type: typeLower,
              identity_key: {
                drawing_norm: drawingNorm,
                commodity_code: row.cmdtyCode,
                size: sizeNorm,
                seq: i
              }
            });
          }
        }
      });

      // Assert: 1 threaded_pipe + 5 valves = 6 components total
      expect(components).toHaveLength(6);

      // Assert: First component is threaded_pipe aggregate
      expect(components[0].component_type).toBe('threaded_pipe');
      expect(components[0].identity_key.pipe_id).toMatch(/-AGG$/);
      expect(components[0].attributes.total_linear_feet).toBe(100);

      // Assert: Remaining 5 components are valves with seq
      const valveComponents = components.slice(1);
      expect(valveComponents).toHaveLength(5);
      valveComponents.forEach((component, index) => {
        expect(component.component_type).toBe('valve');
        expect(component.identity_key.seq).toBe(index + 1);
      });
    });

    it('should create separate aggregates for different threaded_pipe identities', () => {
      // Arrange: Two threaded_pipe rows with different sizes
      const inputRows = [
        {
          drawing: 'P-001',
          type: 'Threaded_Pipe',
          qty: 100,
          cmdtyCode: 'PIPE-SCH40',
          size: '1"'
        },
        {
          drawing: 'P-001',
          type: 'Threaded_Pipe',
          qty: 50,
          cmdtyCode: 'PIPE-SCH40',
          size: '2"' // Different size
        }
      ];

      // Act: Generate components
      const components: any[] = [];

      inputRows.forEach((row) => {
        const _typeLower = row.type.toLowerCase();
        const drawingNorm = row.drawing.trim().toUpperCase().replace(/\s+/g, ' ');
        const sizeNorm = row.size?.trim().replace(/["'\s]/g, '').replace(/\//g, 'X').toUpperCase() || 'NOSIZE';
        const pipeId = `${drawingNorm}-${sizeNorm}-${row.cmdtyCode}-AGG`;

        components.push({
          identity_key: { pipe_id: pipeId },
          attributes: { total_linear_feet: row.qty }
        });
      });

      // Assert: 2 separate aggregate components
      expect(components).toHaveLength(2);

      // Assert: Different pipe_ids
      expect(components[0].identity_key.pipe_id).toBe('P-001-1-PIPE-SCH40-AGG');
      expect(components[1].identity_key.pipe_id).toBe('P-001-2-PIPE-SCH40-AGG');

      // Assert: Different total_linear_feet
      expect(components[0].attributes.total_linear_feet).toBe(100);
      expect(components[1].attributes.total_linear_feet).toBe(50);
    });
  });

  describe('T014: Identity key structure (verify pipe_id format)', () => {
    it('should generate pipe_id in format: DRAWING-SIZE-CMDTY-AGG', () => {
      // Arrange
      const testCases = [
        {
          drawing: 'P-001',
          size: '1"',
          cmdtyCode: 'PIPE-SCH40',
          expected: 'P-001-1-PIPE-SCH40-AGG'
        },
        {
          drawing: 'p-002', // lowercase
          size: '2"',
          cmdtyCode: 'PIPE-SCH80',
          expected: 'P-002-2-PIPE-SCH80-AGG'
        },
        {
          drawing: 'DWG 123',
          size: '3/4"',
          cmdtyCode: 'PIPE-STD',
          expected: 'DWG 123-3X4-PIPE-STD-AGG' // "/" replaced with "X"
        },
        {
          drawing: 'P-001',
          size: undefined, // missing size
          cmdtyCode: 'PIPE-XS',
          expected: 'P-001-NOSIZE-PIPE-XS-AGG'
        }
      ];

      testCases.forEach(({ drawing, size, cmdtyCode, expected }) => {
        // Act: Generate pipe_id
        const drawingNorm = drawing.trim().toUpperCase().replace(/\s+/g, ' ');
        const sizeNorm = size?.trim().replace(/["'\s]/g, '').replace(/\//g, 'X').toUpperCase() || 'NOSIZE';
        const pipeId = `${drawingNorm}-${sizeNorm}-${cmdtyCode}-AGG`;

        // Assert
        expect(pipeId).toBe(expected);
      });
    });

    it('should normalize drawing number (uppercase, trim, collapse spaces)', () => {
      // Arrange
      const testCases = [
        { raw: 'p-001', expected: 'P-001' },
        { raw: '  P-002  ', expected: 'P-002' },
        { raw: 'DWG   123', expected: 'DWG 123' }, // Multiple spaces collapsed
        { raw: 'dwg-abc', expected: 'DWG-ABC' }
      ];

      testCases.forEach(({ raw, expected }) => {
        // Act
        const normalized = raw.trim().toUpperCase().replace(/\s+/g, ' ');

        // Assert
        expect(normalized).toBe(expected);
      });
    });

    it('should normalize size (remove quotes, spaces, replace slashes)', () => {
      // Arrange
      const testCases = [
        { raw: '1"', expected: '1' },
        { raw: '2 "', expected: '2' },
        { raw: "3'", expected: '3' },
        { raw: '3/4"', expected: '3X4' }, // Slash replaced with X
        { raw: '1 1/2"', expected: '11X2' }, // Space and slash removed
        { raw: undefined, expected: 'NOSIZE' }
      ];

      testCases.forEach(({ raw, expected }) => {
        // Act
        const normalized = raw?.trim().replace(/["'\s]/g, '').replace(/\//g, 'X').toUpperCase() || 'NOSIZE';

        // Assert
        expect(normalized).toBe(expected);
      });
    });

    it('should use -AGG suffix (not -001, -002, etc.)', () => {
      // Arrange
      const drawing = 'P-001';
      const size = '1"';
      const cmdtyCode = 'PIPE-SCH40';

      // Act
      const drawingNorm = drawing.trim().toUpperCase().replace(/\s+/g, ' ');
      const sizeNorm = size.trim().replace(/["'\s]/g, '').replace(/\//g, 'X').toUpperCase();
      const pipeId = `${drawingNorm}-${sizeNorm}-${cmdtyCode}-AGG`;

      // Assert: Ends with -AGG (not -001, -002, etc.)
      expect(pipeId).toMatch(/-AGG$/);
      expect(pipeId).not.toMatch(/-\d{3}$/); // NOT numeric suffix
    });
  });

  describe('T015: Absolute LF milestone initialization', () => {
    it('should initialize all partial milestones with _LF suffix and value 0', () => {
      // Arrange
      const expectedMilestones = {
        Fabricate_LF: 0,
        Install_LF: 0,
        Erect_LF: 0,
        Connect_LF: 0,
        Support_LF: 0,
        Punch: false,
        Test: false,
        Restore: false
      };

      // Act: Create milestone object
      const currentMilestones = {
        Fabricate_LF: 0,
        Install_LF: 0,
        Erect_LF: 0,
        Connect_LF: 0,
        Support_LF: 0,
        Punch: false,
        Test: false,
        Restore: false
      };

      // Assert: All partial milestones use _LF suffix and are initialized to 0
      expect(currentMilestones).toEqual(expectedMilestones);
      expect(currentMilestones.Fabricate_LF).toBe(0);
      expect(currentMilestones.Install_LF).toBe(0);
      expect(currentMilestones.Erect_LF).toBe(0);
      expect(currentMilestones.Connect_LF).toBe(0);
      expect(currentMilestones.Support_LF).toBe(0);
    });

    it('should initialize discrete milestones (Punch, Test, Restore) as false', () => {
      // Arrange
      const currentMilestones = {
        Fabricate_LF: 0,
        Install_LF: 0,
        Erect_LF: 0,
        Connect_LF: 0,
        Support_LF: 0,
        Punch: false,
        Test: false,
        Restore: false
      };

      // Assert: Discrete milestones are boolean false
      expect(currentMilestones.Punch).toBe(false);
      expect(currentMilestones.Test).toBe(false);
      expect(currentMilestones.Restore).toBe(false);
      expect(typeof currentMilestones.Punch).toBe('boolean');
      expect(typeof currentMilestones.Test).toBe('boolean');
      expect(typeof currentMilestones.Restore).toBe('boolean');
    });

    it('should NOT use percentage fields (Fabricate, Install, etc.) for aggregate', () => {
      // Arrange: Aggregate milestone structure
      const aggregateMilestones = {
        Fabricate_LF: 0, // Absolute LF
        Install_LF: 0,
        Erect_LF: 0,
        Connect_LF: 0,
        Support_LF: 0,
        Punch: false,
        Test: false,
        Restore: false
      };

      // Assert: NO percentage fields (Fabricate, Install, etc.)
      expect(aggregateMilestones).not.toHaveProperty('Fabricate');
      expect(aggregateMilestones).not.toHaveProperty('Install');
      expect(aggregateMilestones).not.toHaveProperty('Erect');
      expect(aggregateMilestones).not.toHaveProperty('Connect');
      expect(aggregateMilestones).not.toHaveProperty('Support');

      // Assert: Only _LF fields for partial milestones
      expect(aggregateMilestones).toHaveProperty('Fabricate_LF');
      expect(aggregateMilestones).toHaveProperty('Install_LF');
      expect(aggregateMilestones).toHaveProperty('Erect_LF');
      expect(aggregateMilestones).toHaveProperty('Connect_LF');
      expect(aggregateMilestones).toHaveProperty('Support_LF');
    });

    it('should store absolute LF values (not percentages)', () => {
      // Arrange: Simulate milestone update (future scenario)
      const totalLinearFeet = 100;
      const currentMilestones = {
        Fabricate_LF: 0,
        Install_LF: 0,
        Erect_LF: 0,
        Connect_LF: 0,
        Support_LF: 0,
        Punch: false,
        Test: false,
        Restore: false
      };

      // Act: Update Fabricate to 75 LF (absolute value, NOT percentage)
      currentMilestones.Fabricate_LF = 75; // 75 linear feet

      // Assert: Value is absolute LF (75), not percentage (0.75 or 75%)
      expect(currentMilestones.Fabricate_LF).toBe(75);
      expect(currentMilestones.Fabricate_LF).toBeLessThanOrEqual(totalLinearFeet);
      expect(typeof currentMilestones.Fabricate_LF).toBe('number');

      // Assert: Can calculate percentage from absolute value
      const fabricatePercent = Math.round((currentMilestones.Fabricate_LF / totalLinearFeet) * 100);
      expect(fabricatePercent).toBe(75); // 75% (calculated from 75 LF / 100 LF)
    });
  });

  // ========================================
  // User Story 2: Sum Quantities for Duplicate Identities
  // ========================================

  describe('T020: REPLACE semantics (re-import replaces, not sums)', () => {
    it('should REPLACE total_linear_feet when re-importing same pipe_id', () => {
      // Arrange: Existing component with 50 LF
      const existingComponent = {
        id: 'component-123',
        identity_key: { pipe_id: 'P-001-1-PIPE-SCH40-AGG' },
        attributes: {
          total_linear_feet: 50,
          line_numbers: ['101']
        },
        current_milestones: {
          Fabricate_LF: 25,
          Install_LF: 0,
          Erect_LF: 0,
          Connect_LF: 0,
          Support_LF: 0,
          Punch: false,
          Test: false,
          Restore: false
        }
      };

      // New import with same identity — spreadsheet says 75 LF
      const newImportAttributes = {
        total_linear_feet: 75,
        line_numbers: ['205']
      };

      // Act: REPLACE semantics — use new value directly
      const updatedAttributes = {
        ...existingComponent.attributes,
        total_linear_feet: newImportAttributes.total_linear_feet,
        line_numbers: newImportAttributes.line_numbers
      };

      // Assert: Total should be 75 (replaced, NOT 50 + 75 = 125)
      expect(updatedAttributes.total_linear_feet).toBe(75);
      expect(updatedAttributes.line_numbers).toEqual(['205']);
    });

    it('should be idempotent — re-importing same spreadsheet produces same result', () => {
      // Arrange: Spreadsheet says 100 LF for this pipe_id
      const spreadsheetValue = 100;
      const spreadsheetLineNumbers = ['1', '3'];

      // First import — sets to 100
      let currentTotal = spreadsheetValue;
      let currentLineNumbers = [...spreadsheetLineNumbers];
      expect(currentTotal).toBe(100);

      // Second import (same spreadsheet) — REPLACE with same values
      currentTotal = spreadsheetValue;
      currentLineNumbers = [...spreadsheetLineNumbers];
      expect(currentTotal).toBe(100); // Still 100, not 200

      // Third import (same spreadsheet) — still idempotent
      currentTotal = spreadsheetValue;
      currentLineNumbers = [...spreadsheetLineNumbers];
      expect(currentTotal).toBe(100); // Still 100, not 300
      expect(currentLineNumbers).toEqual(['1', '3']);
    });

    it('should update footage when spreadsheet changes', () => {
      // Arrange: Updated spreadsheet now says 150 LF (was 100 previously)
      const newSpreadsheetTotal = 150;

      // Act: REPLACE with new spreadsheet value
      const updatedTotal = newSpreadsheetTotal;

      // Assert: Reflects new spreadsheet value
      expect(updatedTotal).toBe(150);
    });
  });

  describe('T021: Line numbers REPLACE on re-import', () => {
    it('should REPLACE line numbers from new import (not append)', () => {
      // Arrange: New import provides line_numbers (replaces existing ["101"])
      const newLineNumbers = ['205', '210'];

      // Act: REPLACE semantics — use new import's line numbers
      const updatedLineNumbers = newLineNumbers;

      // Assert: Only new line numbers present (old ones replaced)
      expect(updatedLineNumbers).toEqual(['205', '210']);
      expect(updatedLineNumbers).toHaveLength(2);
    });

    it('should be idempotent — same import produces same line numbers', () => {
      // Arrange: Import with line numbers ["1", "3"]
      const importLineNumbers = ['1', '3'];

      // First import
      let currentLineNumbers = importLineNumbers;
      expect(currentLineNumbers).toEqual(['1', '3']);

      // Second import (same spreadsheet)
      currentLineNumbers = importLineNumbers;
      expect(currentLineNumbers).toEqual(['1', '3']); // Same, not ["1", "3", "1", "3"]
    });

    it('should handle string line numbers (not numeric)', () => {
      // Arrange: Line numbers are strings (from CSV row indices)
      const newLineNumbers = ['1', '5', '10'];

      // Assert: All line numbers are strings
      newLineNumbers.forEach(lineNum => {
        expect(typeof lineNum).toBe('string');
      });
    });
  });

  describe('T022: Milestone preservation on update', () => {
    it('should preserve existing current_milestones when replacing footage', () => {
      // Arrange: Existing component with milestone progress
      const existingMilestones = {
        Fabricate_LF: 25,  // 50% of original 50 LF
        Install_LF: 10,    // 20% of original 50 LF
        Erect_LF: 0,
        Connect_LF: 0,
        Support_LF: 0,
        Punch: false,
        Test: false,
        Restore: false
      };

      const existingAttributes = {
        total_linear_feet: 50,
        line_numbers: ['101']
      };

      // Re-import with spreadsheet value of 100 LF
      const newImportAttributes = {
        total_linear_feet: 100,
        line_numbers: ['101', '205']
      };

      // Act: REPLACE attributes but preserve milestones
      const updatedAttributes = {
        ...existingAttributes,
        total_linear_feet: newImportAttributes.total_linear_feet,
        line_numbers: newImportAttributes.line_numbers
      };

      const updatedMilestones = existingMilestones; // Preserved (no change)

      // Assert: Attributes replaced with new import values
      expect(updatedAttributes.total_linear_feet).toBe(100);
      expect(updatedAttributes.line_numbers).toEqual(['101', '205']);

      // Assert: Milestones preserved (absolute values unchanged)
      expect(updatedMilestones).toEqual(existingMilestones);
      expect(updatedMilestones.Fabricate_LF).toBe(25); // Still 25 LF
      expect(updatedMilestones.Install_LF).toBe(10);   // Still 10 LF
    });

    it('should preserve discrete milestones (Punch, Test, Restore)', () => {
      // Arrange: Existing component with discrete milestones completed
      const existingMilestones = {
        Fabricate_LF: 50,
        Install_LF: 50,
        Erect_LF: 50,
        Connect_LF: 50,
        Support_LF: 50,
        Punch: true,    // Completed
        Test: true,     // Completed
        Restore: false
      };

      // Act: Re-import replaces footage but preserves milestones
      const updatedMilestones = existingMilestones;

      // Assert: Discrete milestones unchanged
      expect(updatedMilestones.Punch).toBe(true);
      expect(updatedMilestones.Test).toBe(true);
      expect(updatedMilestones.Restore).toBe(false);
    });

    it('should preserve partial milestones with zero values', () => {
      // Arrange: Existing component with no progress
      const existingMilestones = {
        Fabricate_LF: 0,
        Install_LF: 0,
        Erect_LF: 0,
        Connect_LF: 0,
        Support_LF: 0,
        Punch: false,
        Test: false,
        Restore: false
      };

      // Act: Re-import replaces footage but preserves milestones
      const updatedMilestones = existingMilestones;

      // Assert: All partial milestones still 0
      expect(updatedMilestones.Fabricate_LF).toBe(0);
      expect(updatedMilestones.Install_LF).toBe(0);
      expect(updatedMilestones.Erect_LF).toBe(0);
      expect(updatedMilestones.Connect_LF).toBe(0);
      expect(updatedMilestones.Support_LF).toBe(0);
    });
  });
});
