// scripts/debug_field_weld_report.mjs
// Debug why Field Welds report shows 0% when Weld Log shows completed welds

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env from .env file
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
  console.log('=== Debugging Field Weld Report Issue ===\n');

  // 1. Get project 1605
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', '%1605%')
    .single();

  if (projErr) {
    console.log('Error finding project:', projErr.message);
    return;
  }

  console.log(`Project: ${project.name} (${project.id})\n`);

  // 2. Get field weld components
  const { data: fieldWelds, error: fwErr } = await supabase
    .from('components')
    .select('id, identity_key, component_type, percent_complete, current_milestones, budgeted_manhours')
    .eq('project_id', project.id)
    .eq('component_type', 'field_weld')
    .eq('is_retired', false)
    .limit(20);

  if (fwErr) {
    console.log('Error fetching field welds:', fwErr.message);
    return;
  }

  console.log(`Found ${fieldWelds?.length || 0} field weld components\n`);

  // Show first 10 field welds with their milestones
  console.log('--- Field Weld Component Data ---');
  for (const fw of (fieldWelds || []).slice(0, 10)) {
    console.log(`\n${fw.identity_key?.weld_number || fw.id}:`);
    console.log(`  percent_complete: ${fw.percent_complete}`);
    console.log(`  budgeted_manhours: ${fw.budgeted_manhours}`);
    console.log(`  current_milestones: ${JSON.stringify(fw.current_milestones)}`);
  }

  // 3. Check field_welds table (the actual weld records)
  const { data: weldRecords, error: weldErr } = await supabase
    .from('field_welds')
    .select('id, weld_id, fit_up_date, date_welded, component_id')
    .eq('project_id', project.id)
    .not('date_welded', 'is', null)
    .limit(20);

  console.log(`\n\n--- Field Weld Records (with date_welded) ---`);
  console.log(`Found ${weldRecords?.length || 0} welds with date_welded\n`);

  for (const wr of (weldRecords || []).slice(0, 10)) {
    console.log(`Weld ${wr.weld_id}: fit_up=${wr.fit_up_date}, welded=${wr.date_welded}, component_id=${wr.component_id}`);
  }

  // 4. Check if field_welds have associated components
  const { data: weldsWithComponents } = await supabase
    .from('field_welds')
    .select('id, weld_id, component_id, components(id, identity_key, percent_complete, current_milestones)')
    .eq('project_id', project.id)
    .not('date_welded', 'is', null)
    .limit(10);

  console.log(`\n\n--- Field Welds with Component Links ---`);
  for (const w of (weldsWithComponents || [])) {
    console.log(`\nWeld ${w.weld_id}:`);
    console.log(`  component_id: ${w.component_id}`);
    if (w.components) {
      console.log(`  component identity: ${JSON.stringify(w.components.identity_key)}`);
      console.log(`  component percent_complete: ${w.components.percent_complete}`);
      console.log(`  component milestones: ${JSON.stringify(w.components.current_milestones)}`);
    } else {
      console.log(`  NO LINKED COMPONENT!`);
    }
  }

  // 5. Check the field weld template
  const { data: template } = await supabase.rpc('get_component_template', {
    p_project_id: project.id,
    p_component_type: 'field_weld'
  });

  console.log(`\n\n--- Field Weld Template ---`);
  console.log(JSON.stringify(template, null, 2));

  // 6. Check if there's a project-specific template
  const { data: projectTemplate } = await supabase
    .from('project_progress_templates')
    .select('*')
    .eq('project_id', project.id)
    .eq('component_type', 'field_weld');

  console.log(`\n\n--- Project-Specific Field Weld Template ---`);
  console.log(`Found ${projectTemplate?.length || 0} project-specific template rows`);
  if (projectTemplate?.length) {
    console.log(JSON.stringify(projectTemplate, null, 2));
  }

  // 7. Count total field welds vs those with date_welded
  const { count: totalWelds } = await supabase
    .from('field_welds')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project.id);

  const { count: completedWelds } = await supabase
    .from('field_welds')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .not('date_welded', 'is', null);

  console.log(`\n\n--- Summary ---`);
  console.log(`Total field welds: ${totalWelds}`);
  console.log(`With date_welded: ${completedWelds}`);
  console.log(`Completion rate: ${((completedWelds / totalWelds) * 100).toFixed(1)}%`);
}

debug().catch(console.error);
