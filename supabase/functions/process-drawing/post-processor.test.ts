import { describe, it, expect } from 'vitest';
import {
  applyInstrumentFieldOverride,
  resolveSpecConflict,
  validateThreadedPipe,
} from './post-processor.ts';
import type { BomItem } from './types.ts';

function makeBomItem(overrides: Partial<BomItem>): BomItem {
  return {
    item_type: 'material',
    classification: 'pipe',
    section: 'shop',
    subsection: 'line_items',
    description: null,
    size: null,
    size_2: null,
    quantity: 1,
    uom: null,
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

describe('applyInstrumentFieldOverride', () => {
  it('forces instruments to section=field regardless of input', () => {
    const items = [
      makeBomItem({ classification: 'thermowell', section: 'shop', subsection: 'instruments' }),
      makeBomItem({ classification: 'pipe', section: 'shop', subsection: 'line_items' }),
    ];
    const result = applyInstrumentFieldOverride(items);
    expect(result[0].section).toBe('field');
    expect(result[1].section).toBe('shop'); // unchanged
  });

  it('detects instruments by subsection=instruments even with non-instrument classification', () => {
    const items = [
      makeBomItem({ classification: 'control valve', section: 'field', subsection: 'instruments' }),
    ];
    const result = applyInstrumentFieldOverride(items);
    expect(result[0].section).toBe('field');
    expect(result[0].item_type).toBe('material');
  });
});

describe('resolveSpecConflict', () => {
  it('discards spec that looks like an instrument tag (XX-NNNN)', () => {
    expect(resolveSpecConflict('LT-7501A', 'PU-02')).toBe('PU-02');
  });

  it('keeps per-item spec if it does NOT look like an instrument tag', () => {
    expect(resolveSpecConflict('A-105', 'PU-02')).toBe('A-105');
  });

  it('uses title block spec when item spec is null', () => {
    expect(resolveSpecConflict(null, 'PU-02')).toBe('PU-02');
  });

  it('returns null when both are null', () => {
    expect(resolveSpecConflict(null, null)).toBeNull();
  });
});

describe('validateThreadedPipe', () => {
  it('returns true when pipe item description contains galvanized', () => {
    const items = [
      makeBomItem({ classification: 'pipe', section: 'shop', description: '2" GALVANIZED PIPE A53' }),
    ];
    expect(validateThreadedPipe(items, null)).toBe(true);
  });

  it('returns true when pipe item description contains A53 Type F', () => {
    const items = [
      makeBomItem({ classification: 'pipe', section: 'shop', description: 'PIPE A53 Type F ERW' }),
    ];
    expect(validateThreadedPipe(items, null)).toBe(true);
  });

  it('returns false when only a valve has NPTF (not the pipe)', () => {
    const items = [
      makeBomItem({ classification: 'pipe', section: 'shop', description: 'Pipe B36.19M PE A312 DG TP304' }),
      makeBomItem({ classification: 'gate valve', section: 'shop', description: 'Gate Vlv PE&NPTF A182-F316L' }),
    ];
    expect(validateThreadedPipe(items, null)).toBe(false);
  });

  it('returns true when title block material indicates galvanized', () => {
    expect(validateThreadedPipe([], 'GALV')).toBe(true);
  });

  it('returns false for standard CS pipe', () => {
    const items = [
      makeBomItem({ classification: 'pipe', section: 'shop', description: 'Pipe B36.19M PE A312 DG TP304/TP304L' }),
    ];
    expect(validateThreadedPipe(items, 'CS')).toBe(false);
  });
});
