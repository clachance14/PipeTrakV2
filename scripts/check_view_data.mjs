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

async function check() {
  const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', '%Rail Car Loading%');
  const projectId = projects[0].id;
  console.log('Project:', projects[0].name);

  // Get view data
  const { data: viewData, error } = await supabase
    .from('vw_manhour_progress_by_area')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('\n=== VIEW DATA (vw_manhour_progress_by_area) ===');
  viewData.forEach(row => {
    console.log('\nArea:', row.area_name);
    console.log('  MH Budget:', row.mh_budget);
    console.log('  Receive Budget:', row.receive_mh_budget, '-> Earned:', row.receive_mh_earned);
    console.log('  Install Budget:', row.install_mh_budget, '-> Earned:', row.install_mh_earned);
    console.log('  Total Earned:', row.total_mh_earned);
    console.log('  MH % Complete:', row.mh_pct_complete);

    // Calculate the percentages shown in UI
    const receivePct = row.receive_mh_budget > 0 ? (row.receive_mh_earned / row.receive_mh_budget * 100) : 0;
    const installPct = row.install_mh_budget > 0 ? (row.install_mh_earned / row.install_mh_budget * 100) : 0;
    console.log('  Receive %:', receivePct.toFixed(1) + '%');
    console.log('  Install %:', installPct.toFixed(1) + '%');
  });

  // Sum totals
  let totalBudget = 0;
  let receiveEarned = 0;
  let receiveBudget = 0;
  let installEarned = 0;
  let installBudget = 0;

  viewData.forEach(row => {
    totalBudget += row.mh_budget || 0;
    receiveEarned += row.receive_mh_earned || 0;
    receiveBudget += row.receive_mh_budget || 0;
    installEarned += row.install_mh_earned || 0;
    installBudget += row.install_mh_budget || 0;
  });

  console.log('\n=== GRAND TOTALS ===');
  console.log('MH Budget:', totalBudget);
  console.log('Receive Budget:', receiveBudget, '-> Earned:', receiveEarned);
  console.log('Install Budget:', installBudget, '-> Earned:', installEarned);
  console.log('Receive % (earned/receive_budget):', (receiveEarned / receiveBudget * 100).toFixed(1) + '%');
  console.log('Install % (earned/install_budget):', (installEarned / installBudget * 100).toFixed(1) + '%');
}

check();
