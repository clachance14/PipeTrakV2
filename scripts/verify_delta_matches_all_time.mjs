import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim();
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function verify() {
  const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', '%Rail Car Loading%');
  const projectId = projects[0].id;
  console.log('Project:', projects[0].name);

  // Get All Time data from view
  const { data: viewData } = await supabase
    .from('vw_manhour_progress_by_area')
    .select('*')
    .eq('project_id', projectId);

  // Sum grand totals from view
  const allTimeReceiveBudget = viewData.reduce((sum, row) => sum + (row.receive_mh_budget || 0), 0);
  const allTimeReceiveEarned = viewData.reduce((sum, row) => sum + (row.receive_mh_earned || 0), 0);
  const allTimeInstallBudget = viewData.reduce((sum, row) => sum + (row.install_mh_budget || 0), 0);
  const allTimeInstallEarned = viewData.reduce((sum, row) => sum + (row.install_mh_earned || 0), 0);
  const allTimeTotalBudget = viewData.reduce((sum, row) => sum + (row.mh_budget || 0), 0);
  const allTimeTotalEarned = viewData.reduce((sum, row) => sum + (row.total_mh_earned || 0), 0);

  console.log('\n=== ALL TIME (from view) ===');
  console.log('Receive Budget:', allTimeReceiveBudget.toFixed(2), '-> Earned:', allTimeReceiveEarned.toFixed(2));
  console.log('Receive %:', ((allTimeReceiveEarned / allTimeReceiveBudget) * 100).toFixed(1) + '%');
  console.log('Install Budget:', allTimeInstallBudget.toFixed(2), '-> Earned:', allTimeInstallEarned.toFixed(2));
  console.log('Install %:', ((allTimeInstallEarned / allTimeInstallBudget) * 100).toFixed(1) + '%');
  console.log('Total Budget:', allTimeTotalBudget.toFixed(2), '-> Earned:', allTimeTotalEarned.toFixed(2));
  console.log('Total %:', ((allTimeTotalEarned / allTimeTotalBudget) * 100).toFixed(1) + '%');

  // Get Delta data (Last 30 Days)
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  const { data: deltaData, error } = await supabase.rpc('get_progress_delta_by_dimension', {
    p_project_id: projectId,
    p_dimension: 'area',
    p_start_date: startDate.toISOString(),
    p_end_date: endDate.toISOString(),
  });

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  // Sum grand totals from delta
  const deltaReceiveBudget = deltaData.reduce((sum, row) => sum + (row.receive_mh_budget || 0), 0);
  const deltaReceiveEarned = deltaData.reduce((sum, row) => sum + (row.delta_receive_mh_earned || 0), 0);
  const deltaInstallBudget = deltaData.reduce((sum, row) => sum + (row.install_mh_budget || 0), 0);
  const deltaInstallEarned = deltaData.reduce((sum, row) => sum + (row.delta_install_mh_earned || 0), 0);
  const deltaTotalBudget = deltaData.reduce((sum, row) => sum + (row.mh_budget || 0), 0);
  const deltaTotalEarned = deltaData.reduce((sum, row) => sum + (row.delta_total_mh_earned || 0), 0);

  console.log('\n=== DELTA (Last 30 Days from RPC) ===');
  console.log('Receive Budget:', deltaReceiveBudget.toFixed(2), '-> Earned:', deltaReceiveEarned.toFixed(2));
  console.log('Delta Receive %:', ((deltaReceiveEarned / deltaReceiveBudget) * 100).toFixed(1) + '%');
  console.log('Install Budget:', deltaInstallBudget.toFixed(2), '-> Earned:', deltaInstallEarned.toFixed(2));
  console.log('Delta Install %:', ((deltaInstallEarned / deltaInstallBudget) * 100).toFixed(1) + '%');
  console.log('Total Budget:', deltaTotalBudget.toFixed(2), '-> Earned:', deltaTotalEarned.toFixed(2));
  console.log('Delta Total %:', ((deltaTotalEarned / deltaTotalBudget) * 100).toFixed(1) + '%');

  console.log('\n=== COMPARISON ===');
  console.log('Receive % - All Time:', ((allTimeReceiveEarned / allTimeReceiveBudget) * 100).toFixed(1) + '%',
              '| Delta:', ((deltaReceiveEarned / deltaReceiveBudget) * 100).toFixed(1) + '%');
  console.log('Install % - All Time:', ((allTimeInstallEarned / allTimeInstallBudget) * 100).toFixed(1) + '%',
              '| Delta:', ((deltaInstallEarned / deltaInstallBudget) * 100).toFixed(1) + '%');
  console.log('Total %   - All Time:', ((allTimeTotalEarned / allTimeTotalBudget) * 100).toFixed(1) + '%',
              '| Delta:', ((deltaTotalEarned / deltaTotalBudget) * 100).toFixed(1) + '%');

  // For a project <30 days old, these should match within tolerance
  const receiveDiff = Math.abs((allTimeReceiveEarned / allTimeReceiveBudget) - (deltaReceiveEarned / deltaReceiveBudget)) * 100;
  const installDiff = Math.abs((allTimeInstallEarned / allTimeInstallBudget) - (deltaInstallEarned / deltaInstallBudget)) * 100;
  const totalDiff = Math.abs((allTimeTotalEarned / allTimeTotalBudget) - (deltaTotalEarned / deltaTotalBudget)) * 100;

  console.log('\n=== DIFFERENCES ===');
  console.log('Receive % diff:', receiveDiff.toFixed(2) + ' percentage points');
  console.log('Install % diff:', installDiff.toFixed(2) + ' percentage points');
  console.log('Total % diff:', totalDiff.toFixed(2) + ' percentage points');

  if (receiveDiff < 1 && installDiff < 1 && totalDiff < 1) {
    console.log('\n✅ SUCCESS: Delta percentages match All Time within 1% tolerance');
  } else {
    console.log('\n❌ MISMATCH: Delta percentages differ from All Time by more than 1%');
  }
}

verify();
