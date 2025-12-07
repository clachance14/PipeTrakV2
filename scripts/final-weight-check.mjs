/**
 * Final verification of weight distribution with new logic:
 * - Spools/field_welds inherit size from drawing
 * - Threaded pipe fallback = 1.0
 * - Other fallback = 0.5
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

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

const projectId = 'e34ca1d2-b740-4294-b17c-96fdbc187058';

async function main() {
  // Get all components
  const { data: components, error } = await supabase
    .from('components')
    .select('id, component_type, identity_key, drawing_id')
    .eq('project_id', projectId)
    .eq('is_retired', false);

  if (error) {
    console.error(error);
    return;
  }

  // Build drawing sizes map
  const drawingSizes = new Map();
  for (const c of components) {
    const size = c.identity_key?.size ?? c.identity_key?.SIZE;
    if (size && c.drawing_id) {
      if (!drawingSizes.has(c.drawing_id)) {
        drawingSizes.set(c.drawing_id, new Map());
      }
      const sizeMap = drawingSizes.get(c.drawing_id);
      sizeMap.set(size, (sizeMap.get(size) || 0) + 1);
    }
  }

  // Find most common size per drawing
  const mostCommon = new Map();
  for (const [drawingId, sizeMap] of drawingSizes) {
    let max = 0;
    let best = null;
    for (const [size, count] of sizeMap) {
      if (count > max) {
        max = count;
        best = size;
      }
    }
    mostCommon.set(drawingId, best);
  }

  // Categorize by weight source
  const categories = {
    ownSize: 0,
    inheritedSize: 0,
    threadedFallback: 0,
    otherFallback: 0
  };
  let totalWeight = 0;

  for (const c of components) {
    const hasSize = c.identity_key && ('size' in c.identity_key || 'SIZE' in c.identity_key);
    const size = c.identity_key?.size ?? c.identity_key?.SIZE;
    const isThreaded = c.component_type?.toUpperCase()?.includes('THREADED') || false;

    if (hasSize && size) {
      categories.ownSize++;
      const d = parseInt(size) || 1;
      totalWeight += Math.pow(d, 1.5);
    } else if (c.component_type === 'spool' || c.component_type === 'field_weld') {
      const inheritedSize = mostCommon.get(c.drawing_id);
      if (inheritedSize) {
        categories.inheritedSize++;
        const d = parseInt(inheritedSize) || 1;
        totalWeight += Math.pow(d, 1.5);
      } else {
        categories.otherFallback++;
        totalWeight += 0.5;
      }
    } else if (isThreaded) {
      categories.threadedFallback++;
      totalWeight += 1.0;
    } else {
      categories.otherFallback++;
      totalWeight += 0.5;
    }
  }

  console.log('='.repeat(70));
  console.log('FINAL WEIGHT DISTRIBUTION - 1605 Dark Knight');
  console.log('='.repeat(70));
  console.log('');
  console.log('WEIGHT SOURCE BREAKDOWN:');
  console.log('  Own SIZE field:'.padEnd(40) + categories.ownSize + ' components');
  console.log('  Inherited from drawing:'.padEnd(40) + categories.inheritedSize + ' components');
  console.log('  Threaded pipe fallback (1.0):'.padEnd(40) + categories.threadedFallback + ' components');
  console.log('  Other fallback (0.5):'.padEnd(40) + categories.otherFallback + ' components');
  console.log('');
  console.log('Total components: ' + components.length);
  console.log('Total weight: ' + totalWeight.toFixed(2));
  console.log('');
  console.log('BUDGET SIMULATION (10,000 manhours):');
  const perUnit = 10000 / totalWeight;
  console.log('  Per weight unit: ' + perUnit.toFixed(4) + ' MH');
  console.log('  2-inch component (weight 2.83): ' + (2.83 * perUnit).toFixed(2) + ' MH');
  console.log('  1-inch component (weight 1.00): ' + (1.00 * perUnit).toFixed(2) + ' MH');
  console.log('  Threaded pipe fallback: ' + (1.00 * perUnit).toFixed(2) + ' MH');
  console.log('  Other fallback: ' + (0.50 * perUnit).toFixed(2) + ' MH');
}

main().catch(console.error);
