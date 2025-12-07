// scripts/debug_manhour_view.mjs
// Debug the manhour progress view to see all category columns

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

async function debug() {
  console.log('=== Debugging Manhour Progress View ===\n');

  // Get project 1605
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', '%1605%')
    .single();

  console.log(`Project: ${project.name}\n`);

  // Check vw_manhour_progress_by_area
  const { data: areaProgress, error: areaErr } = await supabase
    .from('vw_manhour_progress_by_area')
    .select('*')
    .eq('project_id', project.id);

  if (areaErr) {
    console.log('Error querying vw_manhour_progress_by_area:', areaErr.message);
  } else {
    console.log('--- vw_manhour_progress_by_area ---');
    for (const row of areaProgress || []) {
      console.log(`\n${row.area_name}:`);
      console.log(`  mh_budget: ${row.mh_budget}`);
      console.log(`  receive_mh_budget: ${row.receive_mh_budget}`);
      console.log(`  receive_mh_earned: ${row.receive_mh_earned}`);
      console.log(`  install_mh_budget: ${row.install_mh_budget}`);
      console.log(`  install_mh_earned: ${row.install_mh_earned}`);
      console.log(`  punch_mh_budget: ${row.punch_mh_budget}`);
      console.log(`  punch_mh_earned: ${row.punch_mh_earned}`);
      console.log(`  test_mh_budget: ${row.test_mh_budget}`);
      console.log(`  test_mh_earned: ${row.test_mh_earned}`);
      console.log(`  restore_mh_budget: ${row.restore_mh_budget}`);
      console.log(`  restore_mh_earned: ${row.restore_mh_earned}`);
      console.log(`  total_mh_earned: ${row.total_mh_earned}`);
      console.log(`  mh_pct_complete: ${row.mh_pct_complete}%`);
    }
  }

  // Also check what columns the view actually has
  console.log('\n\n--- Checking view columns ---');
  const { data: sample } = await supabase
    .from('vw_manhour_progress_by_area')
    .select('*')
    .limit(1);

  if (sample && sample.length > 0) {
    console.log('Columns in vw_manhour_progress_by_area:');
    console.log(Object.keys(sample[0]).join(', '));
  }
}

debug().catch(console.error);
