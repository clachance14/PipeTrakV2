import { describe, it, expect } from 'vitest';
import {
  overrideClassificationFromDescription,
  reconcileBomItems,
  type ClassifiedItem,
} from './bom-reconciler';
import type { BomItem } from './types';

// ── Test helper ────────────────────────────────────────────────────────────

function makeBomItem(overrides: Partial<BomItem> = {}): BomItem {
  return {
    item_type: 'material',
    classification: 'unknown',
    classification_confidence: null,
    section: 'field',
    description: '2" PIPE',
    size: '2',
    size_2: null,
    quantity: 1,
    uom: 'EA',
    spec: null,
    material_grade: null,
    schedule: null,
    schedule_2: null,
    rating: null,
    commodity_code: null,
    end_connection: null,
    item_number: null,
    needs_review: false,
    review_reason: null,
    ...overrides,
  };
}

function makeClassified(overrides: Partial<ClassifiedItem> & { index: number }): ClassifiedItem {
  return {
    classification: 'pipe',
    section: 'shop',
    item_type: 'material',
    confidence: 'high',
    ...overrides,
  };
}

// ── overrideClassificationFromDescription ──────────────────────────────────

describe('overrideClassificationFromDescription', () => {
  it('overrides fitting → gasket when description contains GASKET', () => {
    const result = overrideClassificationFromDescription(
      'fitting',
      '2" SWG GASKET, 150# RF, ASME B16.20',
    );
    expect(result).toBe('gasket');
  });

  it('overrides thermowell → gate valve when description contains VALVE', () => {
    const result = overrideClassificationFromDescription(
      'thermowell',
      '2" GATE VALVE, 150#, BW',
    );
    expect(result).toMatch(/valve/i);
  });

  it('overrides fitting → flange when description contains FLANGE', () => {
    const result = overrideClassificationFromDescription(
      'fitting',
      '4" FLANGE, RFWN, CL 300',
    );
    expect(result).toMatch(/flange/i);
  });

  it('returns original when description has no override keywords', () => {
    const result = overrideClassificationFromDescription(
      'elbow 90 lr',
      '2" ELBOW 90 LR',
    );
    expect(result).toBe('elbow 90 lr');
  });

  it('returns original when description is null', () => {
    const result = overrideClassificationFromDescription('fitting', null);
    expect(result).toBe('fitting');
  });

  it('detects STUD BOLT SET → bolt set', () => {
    const result = overrideClassificationFromDescription(
      'fitting',
      '3/4" STUD BOLT SET, A193 B7',
    );
    expect(result).toBe('bolt set');
  });

  it('detects PIPE SHOE → pipe shoe', () => {
    const result = overrideClassificationFromDescription(
      'fitting',
      'PIPE SHOE 4" STD, PS-101',
    );
    expect(result).toBe('pipe shoe');
  });

  it('does not override gasket classification when description contains GASKET (same category)', () => {
    const result = overrideClassificationFromDescription(
      'gasket',
      '2" SWG GASKET, 150# RF',
    );
    expect(result).toBe('gasket');
  });

  it('does not override bolt set classification when description contains NUT (same category)', () => {
    const result = overrideClassificationFromDescription(
      'bolt set',
      '5/8" STUD BOLT NUT SET',
    );
    expect(result).toBe('bolt set');
  });
});

// ── reconcileBomItems ──────────────────────────────────────────────────────

describe('reconcileBomItems', () => {
  it('uses classified values when available (thermowell → ball valve)', () => {
    const primary = [
      makeBomItem({ classification: 'thermowell', description: '2" ABV, 600#, RFWN' }),
    ];
    const classified: ClassifiedItem[] = [
      makeClassified({ index: 0, classification: 'ball valve', section: 'field', item_type: 'material', confidence: 'high' }),
    ];

    const result = reconcileBomItems(primary, classified);

    expect(result).toHaveLength(1);
    expect(result[0]?.classification).toBe('ball valve');
    expect(result[0]?.section).toBe('field');
    expect(result[0]?.item_type).toBe('material');
    expect(result[0]?.classification_confidence).toBe('high');
  });

  it('falls back to primary when index not in classified', () => {
    const primary = [
      makeBomItem({ classification: 'pipe', section: 'shop' }),
    ];
    const classified: ClassifiedItem[] = []; // nothing classified

    const result = reconcileBomItems(primary, classified);

    expect(result).toHaveLength(1);
    expect(result[0]?.classification).toBe('pipe');
    expect(result[0]?.section).toBe('shop');
    expect(result[0]?.classification_confidence).toBeNull();
  });

  it('applies description override when classification is still wrong (gasket labeled fitting)', () => {
    const primary = [
      makeBomItem({
        classification: 'fitting',
        description: '2" SWG GASKET, 150# RF, ASME B16.20',
      }),
    ];
    // Classifier still returns 'fitting'
    const classified: ClassifiedItem[] = [
      makeClassified({ index: 0, classification: 'fitting', section: 'field', item_type: 'material', confidence: 'medium' }),
    ];

    const result = reconcileBomItems(primary, classified);

    expect(result[0]?.classification).toBe('gasket');
    expect(result[0]?.item_type).toBe('material');
  });

  it('sets needs_review for low confidence items', () => {
    const primary = [
      makeBomItem({ needs_review: false, review_reason: null }),
    ];
    const classified: ClassifiedItem[] = [
      makeClassified({ index: 0, classification: 'elbow 90 lr', confidence: 'low' }),
    ];

    const result = reconcileBomItems(primary, classified);

    expect(result[0]?.needs_review).toBe(true);
    expect(result[0]?.review_reason).toBe('low_confidence_classification');
  });

  it('appends low_confidence reason to existing review_reason', () => {
    const primary = [
      makeBomItem({ needs_review: true, review_reason: 'quantity_not_in_bom' }),
    ];
    const classified: ClassifiedItem[] = [
      makeClassified({ index: 0, confidence: 'low' }),
    ];

    const result = reconcileBomItems(primary, classified);

    expect(result[0]?.needs_review).toBe(true);
    expect(result[0]?.review_reason).toBe(
      'quantity_not_in_bom; low_confidence_classification',
    );
  });

  it('preserves original fields not in classified result (description, size, commodity_code)', () => {
    const primary = [
      makeBomItem({
        description: '4" PIPE SHOE STD',
        size: '4',
        commodity_code: 'G4G-1412-05AA-001-2-2',
        classification: 'fitting',
      }),
    ];
    const classified: ClassifiedItem[] = [
      makeClassified({ index: 0, classification: 'pipe shoe', item_type: 'support', confidence: 'high' }),
    ];

    const result = reconcileBomItems(primary, classified);

    expect(result[0]?.description).toBe('4" PIPE SHOE STD');
    expect(result[0]?.size).toBe('4');
    expect(result[0]?.commodity_code).toBe('G4G-1412-05AA-001-2-2');
    expect(result[0]?.classification).toBe('pipe shoe');
    expect(result[0]?.item_type).toBe('support');
  });

  it('sets item_type to support when description override yields a support classification', () => {
    const primary = [
      makeBomItem({
        classification: 'fitting',
        item_type: 'material',
        description: 'PIPE SHOE 6" STD',
      }),
    ];
    const classified: ClassifiedItem[] = []; // no classifier result

    const result = reconcileBomItems(primary, classified);

    expect(result[0]?.classification).toBe('pipe shoe');
    expect(result[0]?.item_type).toBe('support');
  });

  it('handles multiple items and correct index mapping', () => {
    const primary = [
      makeBomItem({ classification: 'pipe', description: '2" PIPE' }),
      makeBomItem({ classification: 'unknown', description: '2" SWG GASKET, RF' }),
      makeBomItem({ classification: 'fitting', description: '2" ELBOW 90 LR' }),
    ];
    const classified: ClassifiedItem[] = [
      makeClassified({ index: 1, classification: 'gasket', section: 'field', item_type: 'material', confidence: 'high' }),
    ];

    const result = reconcileBomItems(primary, classified);

    // index 0: no classified entry — stays 'pipe'
    expect(result[0]?.classification).toBe('pipe');
    // index 1: classified as gasket, confirmed by description
    expect(result[1]?.classification).toBe('gasket');
    // index 2: no classified entry — description 'ELBOW 90 LR' has no override keyword → stays 'fitting'
    expect(result[2]?.classification).toBe('fitting');
  });
});
