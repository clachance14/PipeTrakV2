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

// Find Dark Knight 1605 project
const { data: projects } = await supabase
  .from('projects')
  .select('id, name')
  .ilike('name', '%1605%dark knight%');

const projectId = projects[0].id;
console.log('Project:', projects[0].name);
console.log('=========================================\n');

// Get all field_weld components with their milestones
const { data: fieldWelds, error: fwErr } = await supabase
  .from('components')
  .select('id, identity_key, component_type, budgeted_manhours, percent_complete, current_milestones')
  .eq('project_id', projectId)
  .eq('component_type', 'field_weld')
  .eq('is_retired', false)
  .limit(10);

if (fwErr) {
  console.error('Error fetching field welds:', fwErr);
  process.exit(1);
}

console.log('Sample Field Welds with milestones:\n');
console.log('Found', fieldWelds?.length || 0, 'field welds');

for (const fw of (fieldWelds || [])) {
  console.log('ID:', fw.identity_key);
  console.log('  Budgeted MH:', fw.budgeted_manhours);
  console.log('  Stored percent_complete:', fw.percent_complete + '%');
  console.log('  Current milestones:', JSON.stringify(fw.current_milestones));

  // Calculate what percent_complete SHOULD be based on progress_templates weights
  // field_weld weights: Fit-up: 10%, Weld Complete: 60%, Punch: 10%, Test: 15%, Restore: 5%
  const milestones = fw.current_milestones || {};

  // Check what milestone keys exist
  const keys = Object.keys(milestones);
  console.log('  Milestone keys:', keys.join(', '));

  // Try to calculate based on expected template
  let calculatedPct = 0;

  // Fit-up (10%)
  const fitup = milestones['Fit-up'] || milestones['Fit-Up'] || milestones['fit-up'] || 0;
  if (fitup === true || fitup === 1 || fitup === 100) calculatedPct += 10;
  else if (typeof fitup === 'number' && fitup > 1) calculatedPct += fitup * 0.10;

  // Weld Complete (60%)
  const weldComplete = milestones['Weld Complete'] || milestones['Weld Made'] || milestones['weld_complete'] || 0;
  if (weldComplete === true || weldComplete === 1 || weldComplete === 100) calculatedPct += 60;
  else if (typeof weldComplete === 'number' && weldComplete > 1) calculatedPct += weldComplete * 0.60;

  // Punch (10%)
  const punch = milestones['Punch'] || milestones['punch'] || 0;
  if (punch === true || punch === 1 || punch === 100) calculatedPct += 10;

  // Test (15%)
  const test = milestones['Test'] || milestones['test'] || 0;
  if (test === true || test === 1 || test === 100) calculatedPct += 15;

  // Restore (5%)
  const restore = milestones['Restore'] || milestones['restore'] || 0;
  if (restore === true || restore === 1 || restore === 100) calculatedPct += 5;

  console.log('  Calculated % (my calc):', calculatedPct + '%');
  console.log('');
}

// Also check what the calculate_earned_milestone_value function returns
console.log('\n=========================================');
console.log('Checking calculate_earned_milestone_value for a sample component...\n');

if (fieldWelds.length > 0) {
  const sample = fieldWelds[0];

  // Call the RPC to see what the function returns
  const { data: installPct, error } = await supabase.rpc('calculate_earned_milestone_value', {
    p_component_type: 'field_weld',
    p_current_milestones: sample.current_milestones,
    p_category: 'installed'
  });

  if (error) {
    console.log('Error calling RPC:', error.message);
  } else {
    console.log('calculate_earned_milestone_value for installed:', installPct);
  }
}
