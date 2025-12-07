// scripts/debug_category_earnings.mjs
// Debug where punch/test/restore earned values are coming from

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
  console.log('=== Debugging Category Earnings Source ===\n');

  // Get project 1605
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', '%1605%')
    .single();

  console.log(`Project: ${project.name}\n`);

  // Get the project template for field_weld
  const { data: fwTemplate } = await supabase
    .from('project_progress_templates')
    .select('*')
    .eq('project_id', project.id)
    .eq('component_type', 'field_weld');

  console.log('--- Field Weld Template ---');
  console.log(JSON.stringify(fwTemplate, null, 2));

  // Check if any field welds have punch/test/restore milestones set
  const { data: fieldWelds } = await supabase
    .from('components')
    .select('id, identity_key, percent_complete, current_milestones, budgeted_manhours')
    .eq('project_id', project.id)
    .eq('component_type', 'field_weld')
    .eq('is_retired', false);

  console.log(`\n\n--- Field Weld Components (${fieldWelds?.length || 0} total) ---`);

  let hasPunch = 0;
  let hasTest = 0;
  let hasRestore = 0;
  let hasPunchValue = 0;
  let hasTestValue = 0;
  let hasRestoreValue = 0;

  for (const fw of fieldWelds || []) {
    const milestones = fw.current_milestones || {};

    // Check if milestones keys include punch/test/restore
    if ('Punch' in milestones) hasPunch++;
    if ('Test' in milestones) hasTest++;
    if ('Restore' in milestones) hasRestore++;

    // Check if they have actual values > 0
    if ((milestones['Punch'] || 0) > 0) hasPunchValue++;
    if ((milestones['Test'] || 0) > 0) hasTestValue++;
    if ((milestones['Restore'] || 0) > 0) hasRestoreValue++;
  }

  console.log(`Field welds with Punch key: ${hasPunch}`);
  console.log(`Field welds with Test key: ${hasTest}`);
  console.log(`Field welds with Restore key: ${hasRestore}`);
  console.log(`Field welds with Punch > 0: ${hasPunchValue}`);
  console.log(`Field welds with Test > 0: ${hasTestValue}`);
  console.log(`Field welds with Restore > 0: ${hasRestoreValue}`);

  // Check spool components for punch/test/restore
  const { data: spools } = await supabase
    .from('components')
    .select('id, identity_key, percent_complete, current_milestones, budgeted_manhours')
    .eq('project_id', project.id)
    .eq('component_type', 'spool')
    .eq('is_retired', false);

  console.log(`\n\n--- Spool Components (${spools?.length || 0} total) ---`);

  let spoolHasPunch = 0;
  let spoolHasTest = 0;
  let spoolHasRestore = 0;
  let spoolHasPunchValue = 0;
  let spoolHasTestValue = 0;
  let spoolHasRestoreValue = 0;

  for (const spool of spools || []) {
    const milestones = spool.current_milestones || {};

    if ('Punch' in milestones) spoolHasPunch++;
    if ('Test' in milestones) spoolHasTest++;
    if ('Restore' in milestones) spoolHasRestore++;

    if ((milestones['Punch'] || 0) > 0) spoolHasPunchValue++;
    if ((milestones['Test'] || 0) > 0) spoolHasTestValue++;
    if ((milestones['Restore'] || 0) > 0) spoolHasRestoreValue++;
  }

  console.log(`Spools with Punch key: ${spoolHasPunch}`);
  console.log(`Spools with Test key: ${spoolHasTest}`);
  console.log(`Spools with Restore key: ${spoolHasRestore}`);
  console.log(`Spools with Punch > 0: ${spoolHasPunchValue}`);
  console.log(`Spools with Test > 0: ${spoolHasTestValue}`);
  console.log(`Spools with Restore > 0: ${spoolHasRestoreValue}`);

  // Show first few spools with punch/test/restore values
  console.log('\n\n--- Sample Spools with Punch/Test/Restore ---');
  let shown = 0;
  for (const spool of spools || []) {
    const milestones = spool.current_milestones || {};
    if ((milestones['Punch'] || 0) > 0 || (milestones['Test'] || 0) > 0 || (milestones['Restore'] || 0) > 0) {
      console.log(`\n${spool.identity_key?.spool_number || spool.id}:`);
      console.log(`  percent_complete: ${spool.percent_complete}`);
      console.log(`  budgeted_manhours: ${spool.budgeted_manhours}`);
      console.log(`  milestones: ${JSON.stringify(milestones)}`);
      shown++;
      if (shown >= 5) break;
    }
  }

  // Check the spool template
  const { data: spoolTemplate } = await supabase
    .from('project_progress_templates')
    .select('*')
    .eq('project_id', project.id)
    .eq('component_type', 'spool');

  console.log('\n\n--- Spool Template ---');
  console.log(JSON.stringify(spoolTemplate, null, 2));
}

debug().catch(console.error);
