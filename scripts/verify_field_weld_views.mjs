// scripts/verify_field_weld_views.mjs
// Verify field weld views now show correct progress after fix

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

async function verify() {
  console.log('=== Verifying Field Weld Views After Fix ===\n');

  // Get project 1605
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', '%1605%')
    .single();

  console.log(`Project: ${project.name}\n`);

  // Check vw_field_weld_progress_by_area
  const { data: areaProgress, error: areaErr } = await supabase
    .from('vw_field_weld_progress_by_area')
    .select('*')
    .eq('project_id', project.id);

  if (areaErr) {
    console.log('Error querying area view:', areaErr.message);
  } else {
    console.log('--- vw_field_weld_progress_by_area ---');
    for (const row of areaProgress || []) {
      console.log(`${row.area_name || 'Unassigned'}:`);
      console.log(`  total_welds: ${row.total_welds}`);
      console.log(`  pct_fitup: ${row.pct_fitup}%`);
      console.log(`  pct_weld_complete: ${row.pct_weld_complete}%`);
      console.log(`  pct_total: ${row.pct_total}%`);
      console.log(`  fitup_count: ${row.fitup_count}`);
      console.log(`  weld_complete_count: ${row.weld_complete_count}`);
      console.log('');
    }
  }

  // Also check welder view
  const { data: welderProgress, error: welderErr } = await supabase
    .from('vw_field_weld_progress_by_welder')
    .select('*')
    .eq('project_id', project.id);

  if (welderErr) {
    console.log('Error querying welder view:', welderErr.message);
  } else {
    console.log('\n--- vw_field_weld_progress_by_welder ---');
    for (const row of welderProgress || []) {
      console.log(`${row.welder_name} (${row.welder_stencil}):`);
      console.log(`  total_welds: ${row.total_welds}`);
      console.log(`  pct_fitup: ${row.pct_fitup}%`);
      console.log(`  pct_weld_complete: ${row.pct_weld_complete}%`);
      console.log(`  pct_total: ${row.pct_total}%`);
      console.log('');
    }
  }

  // Quick summary
  console.log('\n--- Summary ---');
  const totalWelds = areaProgress?.reduce((sum, r) => sum + (r.total_welds || 0), 0) || 0;
  const completedWelds = areaProgress?.reduce((sum, r) => sum + (r.weld_complete_count || 0), 0) || 0;
  console.log(`Total welds: ${totalWelds}`);
  console.log(`Completed (Weld Complete): ${completedWelds}`);
  console.log(`Overall %: ${totalWelds > 0 ? ((completedWelds / totalWelds) * 100).toFixed(1) : 0}%`);
}

verify().catch(console.error);
