/**
 * Dry-run verification script for manhour weight calculation
 * Tests all components in 1605 Dark Knight project
 * DOES NOT MODIFY DATABASE - read-only analysis
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseServiceKey = '';

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim();
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ============================================================================
// SIZE PARSING (copied from src/lib/manhour/parse-size.ts)
// ============================================================================

function parseFraction(value) {
  const trimmed = value.trim();
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch && fractionMatch[1] && fractionMatch[2]) {
    const numerator = parseInt(fractionMatch[1], 10);
    const denominator = parseInt(fractionMatch[2], 10);
    if (denominator === 0) return null;
    return numerator / denominator;
  }
  return null;
}

function parseSizeValue(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const fractionValue = parseFraction(trimmed);
  if (fractionValue !== null) return fractionValue;

  if (/^[0-9]+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  return null;
}

function parseSize(sizeString) {
  const raw = sizeString;
  const trimmed = sizeString.trim().toUpperCase();

  if (!trimmed) return { diameter: null, isReducer: false, raw };
  if (trimmed === 'NOSIZE') return { diameter: null, isReducer: false, raw };
  if (trimmed === 'HALF') return { diameter: 0.5, isReducer: false, raw };

  const reducerMatch = trimmed.match(/^(.+?)X(.+)$/);
  if (reducerMatch && reducerMatch[1] && reducerMatch[2]) {
    const size1 = parseSizeValue(reducerMatch[1]);
    const size2 = parseSizeValue(reducerMatch[2]);
    if (size1 !== null && size2 !== null) {
      return {
        diameter: (size1 + size2) / 2,
        isReducer: true,
        secondDiameter: size2,
        raw
      };
    }
    return { diameter: null, isReducer: false, raw };
  }

  return { diameter: parseSizeValue(trimmed), isReducer: false, raw };
}

// ============================================================================
// WEIGHT CALCULATION (copied from src/lib/manhour/calculate-weight.ts)
// ============================================================================

function normalizeSizeField(size) {
  if (size === null) return null;
  if (size === undefined) return undefined;
  if (typeof size === 'string') return size;
  if (typeof size === 'number') return size.toString();
  return 'invalid_type';
}

function parseLinearFeet(linearFeet) {
  if (linearFeet === null || linearFeet === undefined) return null;
  if (typeof linearFeet === 'number') return linearFeet;
  if (typeof linearFeet === 'string') {
    const parsed = parseFloat(linearFeet);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function preprocessSize(size) {
  let processed = size.trim();
  processed = processed.replace(/"/g, '');
  processed = processed.replace(/\s*\/\s*/g, '/');

  const mixedNumberMatch = processed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedNumberMatch && mixedNumberMatch[1] && mixedNumberMatch[2] && mixedNumberMatch[3]) {
    const whole = parseInt(mixedNumberMatch[1], 10);
    const numerator = parseInt(mixedNumberMatch[2], 10);
    const denominator = parseInt(mixedNumberMatch[3], 10);
    if (denominator !== 0) {
      processed = (whole + (numerator / denominator)).toString();
    }
  }

  processed = processed.replace(/\s*X\s*/gi, 'X');

  if (/X/i.test(processed)) {
    const parts = processed.split(/X/i);
    if (parts.length !== 2 || !parts[0]?.trim() || !parts[1]?.trim()) {
      return null;
    }
  }

  return processed;
}

function calculateWeight(identityKey, componentType) {
  const sizeRaw = 'size' in identityKey ? identityKey.size : identityKey.SIZE;
  const normalizedSize = normalizeSizeField(sizeRaw);

  if (!(('size' in identityKey) || ('SIZE' in identityKey))) {
    return { weight: 0.5, basis: 'fixed', metadata: { reason: 'no_size_field' } };
  }

  if (normalizedSize === null) {
    return { weight: 0.5, basis: 'fixed', metadata: { reason: 'null_size' } };
  }

  if (normalizedSize === undefined) {
    return { weight: 0.5, basis: 'fixed', metadata: { reason: 'undefined_size' } };
  }

  if (normalizedSize === 'invalid_type') {
    return { weight: 0.5, basis: 'fixed', metadata: { reason: 'invalid_size_type', size: sizeRaw } };
  }

  if (normalizedSize.trim() === '') {
    return { weight: 0.5, basis: 'fixed', metadata: { reason: 'empty_size' } };
  }

  const preprocessed = preprocessSize(normalizedSize);
  if (preprocessed === null) {
    return { weight: 0.5, basis: 'fixed', metadata: { reason: 'unparseable_size', size: normalizedSize } };
  }

  const parsed = parseSize(preprocessed);

  if (parsed.diameter === null || parsed.diameter <= 0) {
    return { weight: 0.5, basis: 'fixed', metadata: { reason: 'unparseable_size', size: normalizedSize } };
  }

  const diameter = parsed.diameter;
  const isThreadedPipe = componentType.toUpperCase().includes('THREADED');
  const linearFeetRaw = identityKey.linear_feet ?? identityKey.LINEAR_FEET;
  const linearFeet = parseLinearFeet(linearFeetRaw);

  if (isThreadedPipe && linearFeetRaw !== undefined && linearFeetRaw !== null) {
    if (linearFeet === null) {
      return { weight: 0.5, basis: 'fixed', metadata: { reason: 'invalid_linear_feet', linearFeet: linearFeetRaw } };
    }
    return {
      weight: Math.pow(diameter, 1.5) * linearFeet * 0.1,
      basis: 'linear_feet',
      metadata: { diameter, linearFeet }
    };
  }

  const weight = Math.pow(diameter, 1.5);

  let metadata;
  if (parsed.isReducer && parsed.secondDiameter !== undefined) {
    const d1 = (diameter * 2) - parsed.secondDiameter;
    metadata = { diameter1: d1, diameter2: parsed.secondDiameter, averageDiameter: diameter };
  } else {
    metadata = { diameter };
  }

  return { weight, basis: 'dimension', metadata };
}

// ============================================================================
// MAIN VERIFICATION
// ============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('MANHOUR WEIGHT CALCULATION - DRY RUN VERIFICATION');
  console.log('Project: 1605 Dark Knight');
  console.log('='.repeat(80));
  console.log('\n⚠️  THIS IS A READ-ONLY ANALYSIS - NO DATABASE CHANGES\n');

  // Find the project - "6074 - 1605 Dark Knight Rail Car Loading"
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', 'e34ca1d2-b740-4294-b17c-96fdbc187058')
    .single();

  if (projectError || !project) {
    console.error('Failed to find project:', projectError?.message);
    process.exit(1);
  }

  console.log(`Found project: ${project.name} (${project.id})\n`);

  // Fetch all non-retired components
  const { data: components, error: compError } = await supabase
    .from('components')
    .select('id, component_type, identity_key, is_retired')
    .eq('project_id', project.id)
    .eq('is_retired', false);

  if (compError) {
    console.error('Failed to fetch components:', compError.message);
    process.exit(1);
  }

  console.log(`Total non-retired components: ${components.length}\n`);

  // Categorize results
  const results = {
    dimension: [],      // Calculated from diameter
    linear_feet: [],    // Threaded pipe with linear feet
    fixed: [],          // Fallback weight 0.5
  };

  const fixedReasons = {};
  const componentTypes = {};
  let totalWeight = 0;

  for (const comp of components) {
    const identityKey = comp.identity_key || {};
    const componentType = comp.component_type || '';

    // Track component types
    componentTypes[componentType] = (componentTypes[componentType] || 0) + 1;

    const result = calculateWeight(identityKey, componentType);
    totalWeight += result.weight;

    const record = {
      id: comp.id,
      componentType,
      identityKey,
      weight: result.weight,
      basis: result.basis,
      metadata: result.metadata
    };

    results[result.basis].push(record);

    if (result.basis === 'fixed') {
      const reason = result.metadata.reason;
      fixedReasons[reason] = fixedReasons[reason] || [];
      fixedReasons[reason].push(record);
    }
  }

  // Summary report
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Components with calculated weights (dimension): ${results.dimension.length}`);
  console.log(`✅ Threaded pipe with linear feet: ${results.linear_feet.length}`);
  console.log(`⚠️  Components with fallback weight (0.5): ${results.fixed.length}`);
  console.log(`\n📊 Total weight: ${totalWeight.toFixed(4)}`);

  // Component type breakdown
  console.log('\n' + '-'.repeat(80));
  console.log('COMPONENT TYPES BREAKDOWN');
  console.log('-'.repeat(80));
  const sortedTypes = Object.entries(componentTypes).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    console.log(`  ${type || '(empty)'}`.padEnd(40) + `${count} components`);
  }

  // Fixed weight reasons
  if (results.fixed.length > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log('FALLBACK WEIGHT REASONS (components with 0.5 weight)');
    console.log('-'.repeat(80));
    for (const [reason, comps] of Object.entries(fixedReasons)) {
      console.log(`\n  ${reason}: ${comps.length} components`);
      // Show first 5 examples
      const examples = comps.slice(0, 5);
      for (const ex of examples) {
        const sizeValue = ex.identityKey?.size ?? ex.identityKey?.SIZE ?? '(none)';
        console.log(`    - Type: ${ex.componentType || '(empty)'}, SIZE: ${JSON.stringify(sizeValue)}`);
      }
      if (comps.length > 5) {
        console.log(`    ... and ${comps.length - 5} more`);
      }
    }
  }

  // Sample of calculated weights
  console.log('\n' + '-'.repeat(80));
  console.log('SAMPLE CALCULATED WEIGHTS (first 20)');
  console.log('-'.repeat(80));
  const samples = results.dimension.slice(0, 20);
  for (const s of samples) {
    const sizeValue = s.identityKey?.size ?? s.identityKey?.SIZE ?? '(none)';
    console.log(`  Type: ${s.componentType}`.padEnd(30) +
                `SIZE: ${JSON.stringify(sizeValue)}`.padEnd(20) +
                `Weight: ${s.weight.toFixed(4)}`);
  }

  // Threaded pipe samples
  if (results.linear_feet.length > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log('THREADED PIPE WITH LINEAR FEET');
    console.log('-'.repeat(80));
    for (const s of results.linear_feet.slice(0, 10)) {
      const sizeValue = s.identityKey?.size ?? s.identityKey?.SIZE ?? '(none)';
      const lf = s.metadata.linearFeet;
      console.log(`  SIZE: ${JSON.stringify(sizeValue)}, Linear Feet: ${lf}, Weight: ${s.weight.toFixed(4)}`);
    }
  }

  // Budget simulation
  console.log('\n' + '='.repeat(80));
  console.log('BUDGET SIMULATION');
  console.log('='.repeat(80));
  const exampleBudgets = [1000, 5000, 10000, 25000];
  for (const budget of exampleBudgets) {
    console.log(`\nIf total budget = ${budget.toLocaleString()} manhours:`);
    console.log(`  Per-weight-unit = ${(budget / totalWeight).toFixed(4)} MH`);

    // Show distribution for a sample component
    if (results.dimension.length > 0) {
      const sample = results.dimension[0];
      const allocated = (sample.weight / totalWeight) * budget;
      console.log(`  Sample component (weight ${sample.weight.toFixed(2)}) would get: ${allocated.toFixed(2)} MH`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('VERIFICATION COMPLETE - NO DATABASE CHANGES MADE');
  console.log('='.repeat(80));
}

main().catch(console.error);
