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
const { data: projects, error: projErr } = await supabase
  .from('projects')
  .select('id, name')
  .ilike('name', '%1605%dark knight%');

if (projErr || !projects || projects.length === 0) {
  console.error('Error finding project:', projErr);
  process.exit(1);
}

const projectId = projects[0].id;
console.log('Project:', projects[0].name);
console.log('=========================================\n');

// 1. Dashboard calculation: SUM(budgeted_manhours * percent_complete) / total_budget
const { data: components, error: compErr } = await supabase
  .from('components')
  .select('budgeted_manhours, percent_complete')
  .eq('project_id', projectId)
  .eq('is_retired', false);

if (compErr) {
  console.error('Error fetching components:', compErr);
  process.exit(1);
}

const dashboardEarned = components.reduce((sum, c) => {
  return sum + (c.budgeted_manhours || 0) * (c.percent_complete || 0) / 100;
}, 0);

const dashboardAllocated = components.reduce((sum, c) => {
  return sum + (c.budgeted_manhours || 0);
}, 0);

// Get budget
const { data: budget } = await supabase
  .from('project_manhour_budgets')
  .select('total_budgeted_manhours')
  .eq('project_id', projectId)
  .eq('is_active', true)
  .maybeSingle();

const totalBudget = budget?.total_budgeted_manhours || dashboardAllocated;
const dashboardPct = totalBudget > 0 ? (dashboardEarned / totalBudget) * 100 : 0;

console.log('DASHBOARD CALCULATION (c.percent_complete):');
console.log('  Total Budget:', totalBudget.toFixed(2));
console.log('  Earned MH:', dashboardEarned.toFixed(2));
console.log('  % Complete:', dashboardPct.toFixed(1) + '%');
console.log('');

// 2. Report calculation: from vw_manhour_progress_by_area
const { data: viewData, error: viewErr } = await supabase
  .from('vw_manhour_progress_by_area')
  .select('*')
  .eq('project_id', projectId);

if (viewErr) {
  console.error('Error fetching view:', viewErr);
  process.exit(1);
}

const viewEarned = viewData.reduce((sum, row) => sum + Number(row.total_mh_earned || 0), 0);
const viewBudget = viewData.reduce((sum, row) => sum + Number(row.mh_budget || 0), 0);
const viewPct = viewBudget > 0 ? (viewEarned / viewBudget) * 100 : 0;

console.log('REPORT CALCULATION (vw_manhour_progress_by_area):');
console.log('  MH Budget:', viewBudget.toFixed(2));
console.log('  Total Earned:', viewEarned.toFixed(2));
console.log('  % Complete:', viewPct.toFixed(1) + '%');

// Breakdown by category
const receiveEarned = viewData.reduce((sum, row) => sum + Number(row.receive_mh_earned || 0), 0);
const installEarned = viewData.reduce((sum, row) => sum + Number(row.install_mh_earned || 0), 0);
const punchEarned = viewData.reduce((sum, row) => sum + Number(row.punch_mh_earned || 0), 0);
const testEarned = viewData.reduce((sum, row) => sum + Number(row.test_mh_earned || 0), 0);
const restoreEarned = viewData.reduce((sum, row) => sum + Number(row.restore_mh_earned || 0), 0);

console.log('  --- Category Breakdown ---');
console.log('  Receive Earned:', receiveEarned.toFixed(2));
console.log('  Install Earned:', installEarned.toFixed(2));
console.log('  Punch Earned:', punchEarned.toFixed(2));
console.log('  Test Earned:', testEarned.toFixed(2));
console.log('  Restore Earned:', restoreEarned.toFixed(2));
console.log('  Sum:', (receiveEarned + installEarned + punchEarned + testEarned + restoreEarned).toFixed(2));
console.log('');

// 3. Comparison
console.log('=========================================');
console.log('COMPARISON:');
console.log('  Dashboard %:', dashboardPct.toFixed(1) + '%');
console.log('  Report %:', viewPct.toFixed(1) + '%');
console.log('  Difference:', Math.abs(dashboardPct - viewPct).toFixed(2) + ' percentage points');
console.log('');

if (Math.abs(dashboardPct - viewPct) < 0.5) {
  console.log('  STATUS: MATCH (within 0.5pp tolerance)');
} else {
  console.log('  STATUS: MISMATCH - needs investigation');
}
