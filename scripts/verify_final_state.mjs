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

  // Get total budget and earned MH
  const { data: components } = await supabase
    .from('components')
    .select('budgeted_manhours, percent_complete')
    .eq('project_id', projectId)
    .eq('is_retired', false)
    .not('area_id', 'is', null);

  let totalBudget = 0;
  let totalEarned = 0;

  components.forEach(c => {
    const mh = c.budgeted_manhours || 0;
    totalBudget += mh;
    totalEarned += (c.percent_complete / 100) * mh;
  });

  const currentPct = (totalEarned / totalBudget) * 100;

  console.log('\n=== CURRENT TOTALS ===');
  console.log('Total Budget:', totalBudget.toFixed(2), 'MH');
  console.log('Total Earned:', totalEarned.toFixed(2), 'MH');
  console.log('Current % Complete:', currentPct.toFixed(2) + '%');

  // Get delta from RPC
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: rpcData } = await supabase.rpc('get_progress_delta_by_dimension', {
    p_project_id: projectId,
    p_dimension: 'area',
    p_start_date: thirtyDaysAgo.toISOString(),
    p_end_date: new Date().toISOString()
  });

  let deltaMH = 0;
  let deltaBudget = 0;
  rpcData.forEach(r => {
    deltaMH += parseFloat(r.delta_total_mh_earned) || 0;
    deltaBudget += parseFloat(r.mh_budget) || 0;
  });

  const deltaPct = (deltaMH / deltaBudget) * 100;

  console.log('\n=== DELTA (Last 30 Days) ===');
  console.log('Delta Earned:', deltaMH.toFixed(2), 'MH');
  console.log('Delta Budget:', deltaBudget.toFixed(2), 'MH');
  console.log('Delta % Complete:', deltaPct.toFixed(2) + '%');

  console.log('\n=== COMPARISON ===');
  console.log('Current:', currentPct.toFixed(2) + '%');
  console.log('Delta:', deltaPct.toFixed(2) + '%');
  console.log('Difference:', Math.abs(currentPct - deltaPct).toFixed(2) + '%');

  if (Math.abs(currentPct - deltaPct) < 0.1) {
    console.log('\n✓ SUCCESS: Delta matches Current (within 0.1%)');
  } else {
    console.log('\n✗ MISMATCH: Delta does not match Current');
  }

  // Also check field welds count
  const { data: fieldWelds } = await supabase
    .from('components')
    .select('id, percent_complete, current_milestones')
    .eq('project_id', projectId)
    .eq('component_type', 'field_weld');

  const weldsComplete = fieldWelds.filter(w =>
    (w.current_milestones?.['Weld Complete'] === 100 || w.current_milestones?.['Weld Complete'] === '100')
  ).length;

  console.log('\n=== FIELD WELDS ===');
  console.log('Total:', fieldWelds.length);
  console.log('Weld Complete:', weldsComplete);
}

verify();
