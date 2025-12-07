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

// Check spools vs field welds contribution
const { data: spools } = await supabase
  .from('components')
  .select('budgeted_manhours, percent_complete')
  .eq('project_id', projectId)
  .eq('component_type', 'spool')
  .eq('is_retired', false);

const { data: fieldWelds } = await supabase
  .from('components')
  .select('budgeted_manhours, percent_complete')
  .eq('project_id', projectId)
  .eq('component_type', 'field_weld')
  .eq('is_retired', false);

console.log('SPOOLS:');
const spoolBudget = spools?.reduce((sum, c) => sum + (c.budgeted_manhours || 0), 0) || 0;
const spoolEarned = spools?.reduce((sum, c) => sum + (c.budgeted_manhours || 0) * (c.percent_complete || 0) / 100, 0) || 0;
console.log('  Count:', spools?.length || 0);
console.log('  Budget:', spoolBudget.toFixed(2));
console.log('  Earned (from percent_complete):', spoolEarned.toFixed(2));
console.log('');

console.log('FIELD WELDS:');
const fwBudget = fieldWelds?.reduce((sum, c) => sum + (c.budgeted_manhours || 0), 0) || 0;
const fwEarned = fieldWelds?.reduce((sum, c) => sum + (c.budgeted_manhours || 0) * (c.percent_complete || 0) / 100, 0) || 0;
console.log('  Count:', fieldWelds?.length || 0);
console.log('  Budget:', fwBudget.toFixed(2));
console.log('  Earned (from percent_complete):', fwEarned.toFixed(2));
console.log('');

console.log('TOTAL (spool + field_weld):');
console.log('  Budget:', (spoolBudget + fwBudget).toFixed(2));
console.log('  Earned:', (spoolEarned + fwEarned).toFixed(2));

// Check ALL component types
const { data: allComponents } = await supabase
  .from('components')
  .select('component_type, budgeted_manhours, percent_complete')
  .eq('project_id', projectId)
  .eq('is_retired', false);

const byType = {};
for (const c of (allComponents || [])) {
  const t = c.component_type;
  if (!byType[t]) byType[t] = { count: 0, budget: 0, earned: 0 };
  byType[t].count++;
  byType[t].budget += (c.budgeted_manhours || 0);
  byType[t].earned += (c.budgeted_manhours || 0) * (c.percent_complete || 0) / 100;
}

console.log('\nALL COMPONENT TYPES:');
let totalBudget = 0;
let totalEarned = 0;
for (const [type, data] of Object.entries(byType)) {
  console.log('  ' + type + ':');
  console.log('    Count:', data.count);
  console.log('    Budget:', data.budget.toFixed(2));
  console.log('    Earned:', data.earned.toFixed(2));
  totalBudget += data.budget;
  totalEarned += data.earned;
}

console.log('\nGRAND TOTAL (all types):');
console.log('  Budget:', totalBudget.toFixed(2));
console.log('  Earned:', totalEarned.toFixed(2));
console.log('  % Complete:', (totalEarned / totalBudget * 100).toFixed(1) + '%');

// Check what calculate_earned_milestone_value returns for a field weld with milestones
if (fieldWelds && fieldWelds.length > 0) {
  // Get a field weld with progress
  const { data: fwWithProgress } = await supabase
    .from('components')
    .select('identity_key, budgeted_manhours, percent_complete, current_milestones')
    .eq('project_id', projectId)
    .eq('component_type', 'field_weld')
    .eq('is_retired', false)
    .gt('percent_complete', 0)
    .limit(5);

  console.log('\nFIELD WELDS WITH PROGRESS:');
  for (const fw of (fwWithProgress || [])) {
    console.log('  ID:', fw.identity_key);
    console.log('    percent_complete:', fw.percent_complete);
    console.log('    current_milestones:', JSON.stringify(fw.current_milestones));
  }
}
