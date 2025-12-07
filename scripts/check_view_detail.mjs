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

// Run raw SQL to debug the view calculation
// Let me calculate what a single spool should earn

// Get a spool with progress
const { data: spoolWithProgress } = await supabase
  .from('components')
  .select('identity_key, budgeted_manhours, percent_complete, current_milestones, component_type')
  .eq('project_id', projectId)
  .eq('component_type', 'spool')
  .eq('is_retired', false)
  .gt('percent_complete', 0)
  .limit(1);

if (spoolWithProgress && spoolWithProgress.length > 0) {
  const spool = spoolWithProgress[0];
  console.log('SPOOL WITH PROGRESS:');
  console.log('  ID:', spool.identity_key);
  console.log('  percent_complete:', spool.percent_complete);
  console.log('  budgeted_manhours:', spool.budgeted_manhours);
  console.log('  current_milestones:', JSON.stringify(spool.current_milestones));

  // What the dashboard earned would be:
  const dashboardEarned = spool.budgeted_manhours * spool.percent_complete / 100;
  console.log('  Dashboard Earned:', dashboardEarned.toFixed(2));

  // What the view would calculate:
  // receive_w = 0.05, install_w = 0.80, punch_w = 0.05, test_w = 0.05, restore_w = 0.05
  // For spool with Receive=true, Erect=true, Connect=true:
  //   receive_pct = 100% (5/5*100)
  //   install_pct = 100% (80/80*100)
  //   receive_earned = mh * 0.05 * 100/100 = mh * 0.05
  //   install_earned = mh * 0.80 * 100/100 = mh * 0.80

  // Check milestones
  const milestones = spool.current_milestones || {};
  console.log('\n  Expected view earned calculation:');

  // Receive: 5%
  const hasReceive = milestones['Receive'] === true || milestones['Receive'] === 1 || milestones['Receive'] === 100;
  const receiveEarned = hasReceive ? spool.budgeted_manhours * 0.05 : 0;
  console.log('    Receive:', hasReceive, '-> Earned:', receiveEarned.toFixed(2));

  // Erect: 40%
  const hasErect = milestones['Erect'] === true || milestones['Erect'] === 1 || milestones['Erect'] === 100;
  const erectEarned = hasErect ? spool.budgeted_manhours * 0.40 : 0;
  console.log('    Erect:', hasErect, '-> Earned:', erectEarned.toFixed(2));

  // Connect: 40%
  const hasConnect = milestones['Connect'] === true || milestones['Connect'] === 1 || milestones['Connect'] === 100;
  const connectEarned = hasConnect ? spool.budgeted_manhours * 0.40 : 0;
  console.log('    Connect:', hasConnect, '-> Earned:', connectEarned.toFixed(2));

  // Total install = erect + connect
  const installEarned = erectEarned + connectEarned;
  console.log('    Install (Erect+Connect):', installEarned.toFixed(2));

  // Punch Complete: 5%
  const hasPunch = milestones['Punch Complete'] === true || milestones['Punch Complete'] === 1 || milestones['Punch Complete'] === 100;
  const punchEarned = hasPunch ? spool.budgeted_manhours * 0.05 : 0;
  console.log('    Punch:', hasPunch, '-> Earned:', punchEarned.toFixed(2));

  const viewEarned = receiveEarned + installEarned + punchEarned;
  console.log('\n  Total View Earned:', viewEarned.toFixed(2));
  console.log('  Dashboard Earned:', dashboardEarned.toFixed(2));
  console.log('  MATCH:', Math.abs(viewEarned - dashboardEarned) < 0.01 ? 'YES' : 'NO - difference: ' + (viewEarned - dashboardEarned).toFixed(2));
}
