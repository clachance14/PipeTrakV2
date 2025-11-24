import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseServiceKey = '';

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring(18).trim();
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring(26).trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const DARK_KNIGHT_PROJECT_ID = 'e34ca1d2-b740-4294-b17c-96fdbc187058';

async function main() {
  // First, find the drawing_id for V-26C03
  console.log('Finding drawings that contain the spools...\n');

  const { data: components, error: compError } = await supabase
    .from('components')
    .select('id, drawing_id, identity_key, percent_complete')
    .eq('project_id', DARK_KNIGHT_PROJECT_ID)
    .contains('identity_key', { spool_id: 'V-26C03-SPOOL2' })
    .limit(1);

  if (compError || !components || components.length === 0) {
    console.error('Could not find component');
    return;
  }

  const drawingId = components[0].drawing_id;
  console.log(`Found V-26C03-SPOOL2 on drawing_id: ${drawingId}`);
  console.log(`Component percent_complete: ${components[0].percent_complete}%\n`);

  // Now check mv_drawing_progress for that drawing
  console.log('Checking mv_drawing_progress view...\n');

  const { data: drawingProgress, error: viewError } = await supabase
    .from('mv_drawing_progress')
    .select('*')
    .eq('drawing_id', drawingId);

  if (viewError) {
    console.error('Error querying mv_drawing_progress:', viewError.message);
    return;
  }

  if (!drawingProgress || drawingProgress.length === 0) {
    console.log('❌ Drawing NOT FOUND in mv_drawing_progress view!');
    console.log('This means the materialized view needs to be REFRESHED');
    return;
  }

  const progress = drawingProgress[0];
  console.log('📊 Drawing Progress from mv_drawing_progress:');
  console.log(JSON.stringify(progress, null, 2));

  console.log('\n📊 Analysis:');
  console.log(`   Total Components: ${progress.total_components}`);
  console.log(`   Completed Components: ${progress.completed_components}`);
  console.log(`   Average Percent: ${progress.avg_percent_complete}%`);

  if (progress.avg_percent_complete === 0) {
    console.log('\n❌ PROBLEM: avg_percent_complete is 0%');
    console.log('   The materialized view is STALE and needs to be refreshed!');
    console.log('   Solution: REFRESH MATERIALIZED VIEW mv_drawing_progress;');
  } else {
    console.log('\n✅ Progress is being tracked correctly in the view');
  }

  // Check if we can manually query the components avg
  console.log('\n\nManual query of components for this drawing:');
  const { data: allComponents, error: allCompError } = await supabase
    .from('components')
    .select('id, component_type, percent_complete')
    .eq('drawing_id', drawingId);

  if (!allCompError && allComponents) {
    const avgCalc = allComponents.reduce((sum, c) => sum + c.percent_complete, 0) / allComponents.length;
    console.log(`   Found ${allComponents.length} components`);
    console.log(`   Calculated average: ${avgCalc.toFixed(2)}%`);
    console.log(`   View shows: ${progress.avg_percent_complete}%`);
    console.log(`   Match: ${avgCalc.toFixed(2) === progress.avg_percent_complete.toFixed(2) ? 'YES ✅' : 'NO ❌'}`);
  }
}

main();
