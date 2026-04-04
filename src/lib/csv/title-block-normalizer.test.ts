import { describe, it, expect } from 'vitest';
import { normalizeSpec } from './normalize-spec';

// We test the patterns directly since the edge function uses Deno imports.
// These patterns MUST match supabase/functions/process-drawing/title-block-normalizer.ts

const GENERIC_NO_VALUE = /^(n\/?a|none|nil|--?|-{2,}|\.+)$/i;
const INSULATION_NO_VALUE = /^(n|no|0(\.0+)?"?)$/i;
const HYDRO_NO_VALUE = /^(n|no)$/i;

function normalizeGeneric(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (GENERIC_NO_VALUE.test(trimmed)) return null;
  return trimmed;
}

function normalizeInsulation(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (GENERIC_NO_VALUE.test(trimmed)) return null;
  if (INSULATION_NO_VALUE.test(trimmed)) return null;
  return trimmed;
}

function normalizeHydro(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (GENERIC_NO_VALUE.test(trimmed)) return null;
  if (HYDRO_NO_VALUE.test(trimmed)) return null;
  return trimmed;
}

describe('normalizeGeneric', () => {
  it('returns null for null input', () => {
    expect(normalizeGeneric(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeGeneric('')).toBeNull();
  });

  it('returns null for whitespace-only', () => {
    expect(normalizeGeneric('   ')).toBeNull();
  });

  it.each([
    'N/A', 'n/a', 'NA', 'na',
    'none', 'None', 'NONE',
    'nil', 'NIL',
    '-', '--', '---',
    '.', '..', '...',
  ])('returns null for no-value pattern: "%s"', (input) => {
    expect(normalizeGeneric(input)).toBeNull();
  });

  it.each([
    ['Class 1', 'Class 1'],
    ['40', '40'],
    ['A1A', 'A1A'],
    ['CS', 'CS'],
    ['H', 'H'],
    ['Required', 'Required'],
  ])('preserves real value: "%s" → "%s"', (input, expected) => {
    expect(normalizeGeneric(input)).toBe(expected);
  });

  it('trims whitespace from real values', () => {
    expect(normalizeGeneric('  Class 1  ')).toBe('Class 1');
  });
});

describe('normalizeInsulation', () => {
  it.each([
    'N', 'n', 'No', 'no', 'NO',
    '0', '0.0', '0.00', '0"', '0.0"', '0.00"',
    'N/A', 'none', '-',
  ])('returns null for no-insulation pattern: "%s"', (input) => {
    expect(normalizeInsulation(input)).toBeNull();
  });

  it.each([
    ['H', 'H'],
    ['C', 'C'],
    ['P', 'P'],
    ['3PG', '3PG'],
    ['25H', '25H'],
  ])('preserves real insulation value: "%s" → "%s"', (input, expected) => {
    expect(normalizeInsulation(input)).toBe(expected);
  });
});

describe('normalizeHydro', () => {
  it.each([
    'N', 'n', 'No', 'no', 'NO',
    'N/A', 'none', '-',
  ])('returns null for no-hydro pattern: "%s"', (input) => {
    expect(normalizeHydro(input)).toBeNull();
  });

  it.each([
    ['Required', 'Required'],
    ['Yes', 'Yes'],
    ['150 PSIG', '150 PSIG'],
  ])('preserves real hydro value: "%s" → "%s"', (input, expected) => {
    expect(normalizeHydro(input)).toBe(expected);
  });
});

// ── Orchestration tests ──────────────────────────────────────────────────

interface TitleBlockData {
  drawing_number: string | null;
  sheet_number: string | null;
  line_number: string | null;
  material: string | null;
  schedule: string | null;
  spec: string | null;
  nde_class: string | null;
  pwht: boolean;
  revision: string | null;
  hydro: string | null;
  insulation: string | null;
}

function normalizeTitleBlock(result: TitleBlockData): TitleBlockData {
  const spec = normalizeGeneric(result.spec);
  return {
    ...result,
    drawing_number: normalizeGeneric(result.drawing_number),
    sheet_number: normalizeGeneric(result.sheet_number),
    line_number: normalizeGeneric(result.line_number),
    material: normalizeGeneric(result.material),
    schedule: normalizeGeneric(result.schedule),
    spec: normalizeSpec(spec),
    nde_class: normalizeGeneric(result.nde_class),
    revision: normalizeGeneric(result.revision),
    insulation: normalizeInsulation(result.insulation),
    hydro: normalizeHydro(result.hydro),
  };
}

describe('normalizeTitleBlock', () => {
  const baseTitleBlock: TitleBlockData = {
    drawing_number: 'ISO-2001',
    sheet_number: '1',
    line_number: '6-CS-2003',
    material: 'CS',
    schedule: '40',
    spec: 'PU-32',
    nde_class: 'Class 1',
    pwht: false,
    revision: 'A',
    hydro: 'Required',
    insulation: 'H',
  };

  it('passes through clean values unchanged', () => {
    const result = normalizeTitleBlock(baseTitleBlock);
    expect(result).toEqual(baseTitleBlock);
  });

  it('nullifies generic no-data values across all string fields', () => {
    const dirty: TitleBlockData = {
      ...baseTitleBlock,
      drawing_number: 'N/A',
      sheet_number: 'none',
      line_number: '--',
      material: 'nil',
      schedule: '-',
      nde_class: '...',
      revision: 'NA',
    };
    const result = normalizeTitleBlock(dirty);
    expect(result.drawing_number).toBeNull();
    expect(result.sheet_number).toBeNull();
    expect(result.line_number).toBeNull();
    expect(result.material).toBeNull();
    expect(result.schedule).toBeNull();
    expect(result.nde_class).toBeNull();
    expect(result.revision).toBeNull();
  });

  it('applies insulation-specific patterns to insulation field', () => {
    const result = normalizeTitleBlock({ ...baseTitleBlock, insulation: 'N' });
    expect(result.insulation).toBeNull();
  });

  it('applies hydro-specific patterns to hydro field', () => {
    const result = normalizeTitleBlock({ ...baseTitleBlock, hydro: 'No' });
    expect(result.hydro).toBeNull();
  });

  it('does NOT apply insulation patterns to nde_class', () => {
    const result = normalizeTitleBlock({ ...baseTitleBlock, nde_class: 'N' });
    expect(result.nde_class).toBe('N');
  });

  it('applies both no-data cleanup and normalizeSpec to spec field', () => {
    const result = normalizeTitleBlock({ ...baseTitleBlock, spec: 'PU-32 CC0085888' });
    expect(result.spec).toBe('PU-32');
  });

  it('nullifies spec when it is a no-data value', () => {
    const result = normalizeTitleBlock({ ...baseTitleBlock, spec: 'N/A' });
    expect(result.spec).toBeNull();
  });

  it('preserves pwht boolean unchanged', () => {
    const resultTrue = normalizeTitleBlock({ ...baseTitleBlock, pwht: true });
    expect(resultTrue.pwht).toBe(true);
    const resultFalse = normalizeTitleBlock({ ...baseTitleBlock, pwht: false });
    expect(resultFalse.pwht).toBe(false);
  });
});
