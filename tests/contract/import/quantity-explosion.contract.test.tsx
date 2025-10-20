/**
 * Contract Test: Quantity Explosion Logic
 * Tests the quantity explosion algorithm that creates discrete components from CSV rows
 *
 * Identity key format (SIZE-aware):
 * - Non-instruments: {DRAWING_NORM}-{SIZE_NORM}-{CMDTY CODE}-{001..QTY}
 * - Instruments: {DRAWING_NORM}-{SIZE_NORM}-{CMDTY CODE}
 * - Missing SIZE becomes "NOSIZE"
 */

import { describe, it, expect } from 'vitest';
import { explodeQuantity, type CsvRow, type Component } from '@/lib/csv/explode-quantity';

describe('Quantity Explosion Contract', () => {
  const mockDrawingId = '123e4567-e89b-12d3-a456-426614174000';

  it('creates 4 discrete components for QTY=4 (drawing-scoped, size-aware)', () => {
    const row: CsvRow = {
      DRAWING: 'P-001',
      TYPE: 'Valve',
      QTY: 4,
      'CMDTY CODE': 'VBALU-001',
      SPEC: 'ES-03',
      DESCRIPTION: 'Test Valve',
      SIZE: '2',
      Comments: ''
    };

    const components = explodeQuantity(row, mockDrawingId);

    expect(components).toHaveLength(4);
    expect(components[0].identity_key).toBe('P-001-2-VBALU-001-001');
    expect(components[1].identity_key).toBe('P-001-2-VBALU-001-002');
    expect(components[2].identity_key).toBe('P-001-2-VBALU-001-003');
    expect(components[3].identity_key).toBe('P-001-2-VBALU-001-004');
  });

  it('uses drawing-scoped CMDTY CODE for instruments (no qty suffix, with size)', () => {
    const row: CsvRow = {
      DRAWING: 'P-001',
      TYPE: 'Instrument',
      QTY: 1,
      'CMDTY CODE': 'ME-55402',
      SPEC: 'ES-03',
      DESCRIPTION: 'Test Instrument',
      SIZE: '2',
      Comments: ''
    };

    const components = explodeQuantity(row, mockDrawingId);

    expect(components).toHaveLength(1);
    expect(components[0].identity_key).toBe('P-001-2-ME-55402'); // With size, no qty suffix
  });

  it('populates attributes from CSV row', () => {
    const row: CsvRow = {
      DRAWING: 'P-001',
      TYPE: 'Valve',
      QTY: 1,
      'CMDTY CODE': 'VBALU-001',
      SPEC: 'ES-03',
      DESCRIPTION: 'Blind Flg B16.5 cl150',
      SIZE: '2',
      Comments: 'Test comment'
    };

    const components = explodeQuantity(row, mockDrawingId);

    expect(components[0].attributes).toEqual({
      spec: 'ES-03',
      description: 'Blind Flg B16.5 cl150',
      size: '2',
      cmdty_code: 'VBALU-001',
      comments: 'Test comment',
      original_qty: 1
    });
  });

  it('assigns correct component_type from CSV TYPE (lowercased)', () => {
    const types = [
      { csv: 'Valve', db: 'valve' },
      { csv: 'Instrument', db: 'instrument' },
      { csv: 'Support', db: 'support' },
      { csv: 'Pipe', db: 'pipe' },
      { csv: 'Fitting', db: 'fitting' },
      { csv: 'Flange', db: 'flange' }
    ];

    types.forEach(({ csv, db }) => {
      const row: CsvRow = {
        DRAWING: 'P-001',
        TYPE: csv,
        QTY: 1,
        'CMDTY CODE': 'TEST-001'
      };

      const components = explodeQuantity(row, mockDrawingId);
      expect(components[0].component_type).toBe(db); // Database expects lowercase
    });
  });

  it('handles large quantities (QTY=100) and missing SIZE → NOSIZE', () => {
    const row: CsvRow = {
      DRAWING: 'P-001',
      TYPE: 'Support',
      QTY: 100,
      'CMDTY CODE': 'SUPPORT-001'
    };

    const components = explodeQuantity(row, mockDrawingId);

    expect(components).toHaveLength(100);
    expect(components[0].identity_key).toBe('P-001-NOSIZE-SUPPORT-001-001');
    expect(components[99].identity_key).toBe('P-001-NOSIZE-SUPPORT-001-100'); // Zero-padded to 3 digits
  });

  it('assigns drawing_id to all exploded components', () => {
    const row: CsvRow = {
      DRAWING: 'P-001',
      TYPE: 'Valve',
      QTY: 3,
      'CMDTY CODE': 'VBALU-001'
    };

    const components = explodeQuantity(row, mockDrawingId);

    components.forEach(component => {
      expect(component.drawing_id).toBe(mockDrawingId);
    });
  });
});
