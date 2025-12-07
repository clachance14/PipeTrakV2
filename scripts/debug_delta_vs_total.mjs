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

async function investigate() {
  // Get project
  const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', '%Rail Car Loading%');
  if (!projects || projects.length === 0) {
    console.log('No project found');
    return;
  }
  const projectId = projects[0].id;
  console.log('Project:', projects[0].name);

  // Get current total % complete from dashboard view or components
  const { data: components } = await supabase
    .from('components')
    .select('id, component_type, percent_complete, budgeted_manhours')
    .eq('project_id', projectId)
    .eq('is_retired', false);

  let totalMH = 0;
  let earnedMH = 0;
  components.forEach(c => {
    const mh = c.budgeted_manhours || 0;
    const pct = c.percent_complete || 0;
    totalMH += mh;
    earnedMH += (pct / 100) * mh;
  });

  const currentPctComplete = totalMH > 0 ? (earnedMH / totalMH) * 100 : 0;
  console.log('\n=== CURRENT STATE ===');
  console.log('Total MH Budget:', totalMH);
  console.log('Total MH Earned:', earnedMH.toFixed(2));
  console.log('Current % Complete:', currentPctComplete.toFixed(2) + '%');

  // Get delta from RPC
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const now = new Date();

  console.log('\n=== DELTA CALCULATION (Last 30 Days) ===');
  console.log('Date range:', thirtyDaysAgo.toISOString(), 'to', now.toISOString());

  const { data: deltaData, error } = await supabase.rpc('get_progress_delta_by_dimension', {
    p_project_id: projectId,
    p_dimension: 'area',
    p_start_date: thirtyDaysAgo.toISOString(),
    p_end_date: now.toISOString()
  });

  if (error) {
    console.log('RPC error:', error);
    return;
  }

  let totalDeltaMH = 0;
  let totalBudgetMH = 0;
  deltaData.forEach(row => {
    console.log('  ' + row.dimension_name + ': delta_mh=' + row.delta_total_mh_earned + ', budget=' + row.mh_budget + ', delta_pct=' + row.delta_mh_pct_complete + '%');
    totalDeltaMH += parseFloat(row.delta_total_mh_earned) || 0;
    totalBudgetMH += parseFloat(row.mh_budget) || 0;
  });

  const deltaPct = totalBudgetMH > 0 ? (totalDeltaMH / totalBudgetMH) * 100 : 0;
  console.log('\nTotal delta MH earned:', totalDeltaMH.toFixed(2));
  console.log('Total delta % complete:', deltaPct.toFixed(2) + '%');

  // The issue: delta > current total
  console.log('\n=== DISCREPANCY ===');
  console.log('Current % Complete:', currentPctComplete.toFixed(2) + '%');
  console.log('Delta % (30 days):', deltaPct.toFixed(2) + '%');
  if (deltaPct > currentPctComplete) {
    console.log('ERROR: Delta exceeds current total by', (deltaPct - currentPctComplete).toFixed(2) + '%');
  }

  // Check: what is the percent_complete calculation based on?
  // The dashboard uses a different calculation than the delta
  console.log('\n=== COMPONENT BREAKDOWN ===');
  const byType = {};
  components.forEach(c => {
    if (!byType[c.component_type]) {
      byType[c.component_type] = { count: 0, mh: 0, earned: 0 };
    }
    byType[c.component_type].count++;
    byType[c.component_type].mh += c.budgeted_manhours || 0;
    byType[c.component_type].earned += ((c.percent_complete || 0) / 100) * (c.budgeted_manhours || 0);
  });

  Object.entries(byType).forEach(([type, data]) => {
    const pct = data.mh > 0 ? (data.earned / data.mh) * 100 : 0;
    console.log('  ' + type + ': count=' + data.count + ', mh=' + data.mh + ', earned=' + data.earned.toFixed(2) + ', pct=' + pct.toFixed(2) + '%');
  });
}

investigate();
