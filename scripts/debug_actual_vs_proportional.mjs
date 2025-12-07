// scripts/debug_actual_vs_proportional.mjs
// Compare actual category earned vs proportional allocation

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
  console.log('=== Comparing Actual vs Proportional Category Earned ===\n');

  // Get project 1605
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', '%1605%')
    .single();

  console.log(`Project: ${project.name}\n`);

  // Get a few field weld components with their milestones
  const { data: fieldWelds } = await supabase
    .from('components')
    .select('id, identity_key, percent_complete, current_milestones, budgeted_manhours')
    .eq('project_id', project.id)
    .eq('component_type', 'field_weld')
    .eq('is_retired', false)
    .limit(5);

  console.log('--- Field Weld Component Analysis ---\n');

  for (const fw of fieldWelds || []) {
    const weldNum = fw.identity_key?.weld_number || fw.id;
    console.log(`Field Weld ${weldNum}:`);
    console.log(`  budgeted_manhours: ${fw.budgeted_manhours}`);
    console.log(`  percent_complete: ${fw.percent_complete}`);
    console.log(`  milestones: ${JSON.stringify(fw.current_milestones)}`);

    // Call the RPC to get actual category earned
    const { data: categoryData, error } = await supabase.rpc('calculate_category_earned_mh', {
      p_project_id: project.id,
      p_component_type: 'field_weld',
      p_current_milestones: fw.current_milestones || {},
      p_budgeted_manhours: fw.budgeted_manhours
    });

    if (error) {
      console.log(`  ERROR: ${error.message}`);
    } else {
      console.log('  Actual category earned:');
      for (const cat of categoryData) {
        console.log(`    ${cat.category}: ${cat.category_pct}% complete, ${cat.earned_mh.toFixed(4)} MH earned`);
      }
    }
    console.log('');
  }

  // Now sum up across all field welds
  console.log('\n=== Aggregated Field Weld Category Earnings ===\n');

  const { data: allFieldWelds } = await supabase
    .from('components')
    .select('id, current_milestones, budgeted_manhours')
    .eq('project_id', project.id)
    .eq('component_type', 'field_weld')
    .eq('is_retired', false);

  const totals = {
    receive: 0,
    install: 0,
    punch: 0,
    test: 0,
    restore: 0
  };

  for (const fw of allFieldWelds || []) {
    const { data: categoryData } = await supabase.rpc('calculate_category_earned_mh', {
      p_project_id: project.id,
      p_component_type: 'field_weld',
      p_current_milestones: fw.current_milestones || {},
      p_budgeted_manhours: fw.budgeted_manhours
    });

    for (const cat of categoryData || []) {
      totals[cat.category] = (totals[cat.category] || 0) + cat.earned_mh;
    }
  }

  console.log('Actual earned by category (from calculate_category_earned_mh):');
  for (const [cat, mh] of Object.entries(totals)) {
    console.log(`  ${cat}: ${mh.toFixed(4)} MH`);
  }

  // Compare to view data
  console.log('\n\nView data (from vw_manhour_progress_by_area - proportional):');
  const { data: viewData } = await supabase
    .from('vw_manhour_progress_by_area')
    .select('*')
    .eq('project_id', project.id);

  for (const row of viewData || []) {
    console.log(`  receive_mh_earned: ${row.receive_mh_earned.toFixed(4)}`);
    console.log(`  install_mh_earned: ${row.install_mh_earned.toFixed(4)}`);
    console.log(`  punch_mh_earned: ${row.punch_mh_earned.toFixed(4)}`);
    console.log(`  test_mh_earned: ${row.test_mh_earned.toFixed(4)}`);
    console.log(`  restore_mh_earned: ${row.restore_mh_earned.toFixed(4)}`);
  }

  console.log('\n\nSPOOLS:');

  // Now do the same for spools
  const { data: allSpools } = await supabase
    .from('components')
    .select('id, current_milestones, budgeted_manhours')
    .eq('project_id', project.id)
    .eq('component_type', 'spool')
    .eq('is_retired', false);

  const spoolTotals = {
    receive: 0,
    install: 0,
    punch: 0,
    test: 0,
    restore: 0
  };

  for (const spool of allSpools || []) {
    const { data: categoryData } = await supabase.rpc('calculate_category_earned_mh', {
      p_project_id: project.id,
      p_component_type: 'spool',
      p_current_milestones: spool.current_milestones || {},
      p_budgeted_manhours: spool.budgeted_manhours
    });

    for (const cat of categoryData || []) {
      spoolTotals[cat.category] = (spoolTotals[cat.category] || 0) + cat.earned_mh;
    }
  }

  console.log('Actual earned by category for SPOOLS:');
  for (const [cat, mh] of Object.entries(spoolTotals)) {
    console.log(`  ${cat}: ${mh.toFixed(4)} MH`);
  }

  console.log('\n\nGRAND TOTALS (Actual):');
  console.log(`  receive: ${(totals.receive + spoolTotals.receive).toFixed(4)} MH`);
  console.log(`  install: ${(totals.install + spoolTotals.install).toFixed(4)} MH`);
  console.log(`  punch: ${(totals.punch + spoolTotals.punch).toFixed(4)} MH`);
  console.log(`  test: ${(totals.test + spoolTotals.test).toFixed(4)} MH`);
  console.log(`  restore: ${(totals.restore + spoolTotals.restore).toFixed(4)} MH`);
}

debug().catch(console.error);
