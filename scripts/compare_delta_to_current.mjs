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

async function compare() {
  const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', '%Rail Car Loading%');
  const projectId = projects[0].id;
  console.log('Project:', projects[0].name);

  // Get current totals from mv_area_progress
  const { data: currentData } = await supabase
    .from('mv_area_progress')
    .select('*')
    .eq('project_id', projectId);

  console.log('\n=== CURRENT TOTALS (from mv_area_progress) ===');
  let currentReceived = 0;
  let currentInstalled = 0;
  let currentPunch = 0;
  let currentTest = 0;
  let currentRestore = 0;
  let currentTotal = 0;
  let totalBudget = 0;

  currentData.forEach(row => {
    currentReceived += parseFloat(row.received_mh) || 0;
    currentInstalled += parseFloat(row.installed_mh) || 0;
    currentPunch += parseFloat(row.punch_mh) || 0;
    currentTest += parseFloat(row.tested_mh) || 0;
    currentRestore += parseFloat(row.restored_mh) || 0;
    currentTotal += parseFloat(row.total_mh_earned) || 0;
    totalBudget += parseFloat(row.total_mh_budget) || 0;
  });

  console.log('Budget:', totalBudget.toFixed(2), 'MH');
  console.log('Received:', currentReceived.toFixed(2), 'MH (' + (currentReceived/totalBudget*100).toFixed(2) + '%)');
  console.log('Installed:', currentInstalled.toFixed(2), 'MH (' + (currentInstalled/totalBudget*100).toFixed(2) + '%)');
  console.log('Punch:', currentPunch.toFixed(2), 'MH (' + (currentPunch/totalBudget*100).toFixed(2) + '%)');
  console.log('Test:', currentTest.toFixed(2), 'MH (' + (currentTest/totalBudget*100).toFixed(2) + '%)');
  console.log('Restore:', currentRestore.toFixed(2), 'MH (' + (currentRestore/totalBudget*100).toFixed(2) + '%)');
  console.log('Total:', currentTotal.toFixed(2), 'MH (' + (currentTotal/totalBudget*100).toFixed(2) + '%)');

  // Get delta from RPC
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: deltaData } = await supabase.rpc('get_progress_delta_by_dimension', {
    p_project_id: projectId,
    p_dimension: 'area',
    p_start_date: thirtyDaysAgo.toISOString(),
    p_end_date: new Date().toISOString()
  });

  console.log('\n=== DELTA (Last 30 Days from RPC) ===');
  let deltaReceived = 0;
  let deltaInstalled = 0;
  let deltaPunch = 0;
  let deltaTest = 0;
  let deltaRestore = 0;
  let deltaTotal = 0;
  let deltaBudget = 0;

  deltaData.forEach(row => {
    deltaReceived += parseFloat(row.delta_receive_mh_earned) || 0;
    deltaInstalled += parseFloat(row.delta_install_mh_earned) || 0;
    deltaPunch += parseFloat(row.delta_punch_mh_earned) || 0;
    deltaTest += parseFloat(row.delta_test_mh_earned) || 0;
    deltaRestore += parseFloat(row.delta_restore_mh_earned) || 0;
    deltaTotal += parseFloat(row.delta_total_mh_earned) || 0;
    deltaBudget += parseFloat(row.mh_budget) || 0;
  });

  console.log('Budget:', deltaBudget.toFixed(2), 'MH');
  console.log('Received:', deltaReceived.toFixed(2), 'MH (' + (deltaReceived/deltaBudget*100).toFixed(2) + '%)');
  console.log('Installed:', deltaInstalled.toFixed(2), 'MH (' + (deltaInstalled/deltaBudget*100).toFixed(2) + '%)');
  console.log('Punch:', deltaPunch.toFixed(2), 'MH (' + (deltaPunch/deltaBudget*100).toFixed(2) + '%)');
  console.log('Test:', deltaTest.toFixed(2), 'MH (' + (deltaTest/deltaBudget*100).toFixed(2) + '%)');
  console.log('Restore:', deltaRestore.toFixed(2), 'MH (' + (deltaRestore/deltaBudget*100).toFixed(2) + '%)');
  console.log('Total:', deltaTotal.toFixed(2), 'MH (' + (deltaTotal/deltaBudget*100).toFixed(2) + '%)');

  console.log('\n=== GAPS (Current - Delta) ===');
  console.log('Received Gap:', (currentReceived - deltaReceived).toFixed(2), 'MH');
  console.log('Installed Gap:', (currentInstalled - deltaInstalled).toFixed(2), 'MH');
  console.log('Punch Gap:', (currentPunch - deltaPunch).toFixed(2), 'MH');
  console.log('Test Gap:', (currentTest - deltaTest).toFixed(2), 'MH');
  console.log('Restore Gap:', (currentRestore - deltaRestore).toFixed(2), 'MH');
  console.log('Total Gap:', (currentTotal - deltaTotal).toFixed(2), 'MH');
}

compare();
