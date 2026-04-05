import { describe, it, expect } from 'vitest';
import { buildClassificationPrompt } from './bom-classifier';
import type { BomItem, TitleBlockData } from './types';

// ── Test helper ─────────────────────────────────────────────────────────

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

function makeTitleBlock(overrides: Partial<TitleBlockData> = {}): TitleBlockData {
  return {
    drawing_number: null,
    sheet_number: null,
    line_number: null,
    material: null,
    schedule: null,
    spec: null,
    nde_class: null,
    pwht: false,
    revision: null,
    hydro: null,
    insulation: null,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('buildClassificationPrompt', () => {
  it('includes title block context when provided', () => {
    const titleBlock = makeTitleBlock({
      spec: 'A1-CS-150',
      material: 'CS',
      schedule: '40',
      line_number: '6"-P-1234-A1',
    });
    const items = [makeBomItem()];
    const prompt = buildClassificationPrompt(items, titleBlock);

    expect(prompt).toContain('Spec: A1-CS-150');
    expect(prompt).toContain('Material: CS');
    expect(prompt).toContain('Schedule: 40');
    expect(prompt).toContain('Line Number: 6"-P-1234-A1');
  });

  it('works without title block (null)', () => {
    const items = [makeBomItem()];
    // Should not throw
    const prompt = buildClassificationPrompt(items, null);

    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
    // Title block section should not appear
    expect(prompt).not.toContain('<title_block_context>');
  });

  it('includes item descriptions with correct indices', () => {
    const items = [
      makeBomItem({ description: '2" GATE VALVE, 150#, RFWN' }),
      makeBomItem({ description: '4" PIPE SHOE' }),
    ];
    const prompt = buildClassificationPrompt(items, null);

    expect(prompt).toContain('[0]');
    expect(prompt).toContain('2" GATE VALVE, 150#, RFWN');
    expect(prompt).toContain('[1]');
    expect(prompt).toContain('4" PIPE SHOE');
  });

  it('includes current classification for review', () => {
    const items = [
      makeBomItem({ classification: 'thermowell', description: '2" ABV, 600#, RFWN' }),
    ];
    const prompt = buildClassificationPrompt(items, null);

    expect(prompt).toContain('CurrentClass: thermowell');
  });

  it('includes valve abbreviation dictionary with ABV entry', () => {
    const items = [makeBomItem()];
    const prompt = buildClassificationPrompt(items, null);

    expect(prompt).toContain('ABV = Automatic Block Valve');
  });
});
