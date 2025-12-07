// scripts/debug_field_weld_report2.mjs
// Debug field_welds table vs components table

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
  console.log('=== Debugging Field Welds Table ===\n');

  // Get project 1605
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', '%1605%')
    .single();

  console.log(`Project: ${project.name}\n`);

  // Check actual field_welds data with date_welded
  // Join with components to get the weld_number from identity_key
  const { data: weldsWithDates, error } = await supabase
    .from('field_welds')
    .select('id, component_id, date_welded, welder_id, status, components(id, identity_key, percent_complete, current_milestones)')
    .eq('project_id', project.id)
    .limit(30);

  console.log(`Total welds returned: ${weldsWithDates?.length || 0}`);
  if (error) {
    console.log('Error:', error.message);
  }

  console.log('\n--- Field Welds with Dates ---');
  let withDateWelded = 0;

  for (const w of (weldsWithDates || []).slice(0, 30)) {
    if (w.date_welded) withDateWelded++;
    const weldNumber = w.components?.identity_key?.weld_number || 'unknown';
    console.log(`Weld ${weldNumber}:`);
    console.log(`  date_welded: ${w.date_welded || 'NULL'}`);
    console.log(`  welder_id: ${w.welder_id || 'NULL'}`);
    console.log(`  status: ${w.status}`);
    console.log(`  component percent_complete: ${w.components?.percent_complete}`);
    console.log(`  component milestones: ${JSON.stringify(w.components?.current_milestones)}`);
    console.log('');
  }

  console.log(`\n--- Summary of ${weldsWithDates?.length} welds ---`);
  console.log(`With date_welded: ${withDateWelded}`);

  // Check if components are linked to field_welds
  const { data: linkedWelds } = await supabase
    .from('field_welds')
    .select('weld_id, component_id, date_welded, components!inner(id, percent_complete, current_milestones)')
    .eq('project_id', project.id)
    .not('component_id', 'is', null)
    .limit(10);

  console.log(`\n\n--- Field Welds Linked to Components ---`);
  console.log(`Found ${linkedWelds?.length || 0} welds with components`);
  for (const w of (linkedWelds || []).slice(0, 5)) {
    console.log(`\nWeld ${w.weld_id}:`);
    console.log(`  date_welded: ${w.date_welded || 'NULL'}`);
    console.log(`  component percent_complete: ${w.components?.percent_complete}`);
    console.log(`  component milestones: ${JSON.stringify(w.components?.current_milestones)}`);
  }

  // Check total field_welds with and without component_id
  const { count: withComponent } = await supabase
    .from('field_welds')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .not('component_id', 'is', null);

  const { count: withoutComponent } = await supabase
    .from('field_welds')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .is('component_id', null);

  console.log(`\n\n--- Component Linkage ---`);
  console.log(`Field welds WITH component_id: ${withComponent}`);
  console.log(`Field welds WITHOUT component_id: ${withoutComponent}`);

  // Check if there's a sync trigger or function
  console.log('\n\n--- Looking for sync mechanism ---');
  console.log('Field welds should sync milestones to components when date_welded is set');
  console.log('Current behavior: milestones on components are all 0 even though welds have dates');
}

debug().catch(console.error);
