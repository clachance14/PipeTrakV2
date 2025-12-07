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

  // Get project templates for weight lookup
  const { data: projTemplates } = await supabase
    .from('project_progress_templates')
    .select('component_type, milestone_name, weight')
    .eq('project_id', projectId);

  // Get system templates
  const { data: sysTemplates } = await supabase
    .from('progress_templates')
    .select('component_type, milestones_config')
    .eq('version', 1);

  const systemWeights = {};
  sysTemplates.forEach(t => {
    systemWeights[t.component_type] = {};
    t.milestones_config.forEach(m => {
      systemWeights[t.component_type][m.name.toLowerCase()] = m.weight;
    });
  });

  const projectWeights = {};
  projTemplates.forEach(pt => {
    if (!projectWeights[pt.component_type]) {
      projectWeights[pt.component_type] = {};
    }
    projectWeights[pt.component_type][pt.milestone_name.toLowerCase()] = pt.weight;
  });

  function getWeight(componentType, milestoneName) {
    const lowerName = milestoneName.toLowerCase();
    const projWeight = projectWeights[componentType]?.[lowerName];
    if (projWeight !== undefined) return projWeight;
    return systemWeights[componentType]?.[lowerName] || 0;
  }

  // Get standard category mapping
  async function getCategory(componentType, milestoneName) {
    const { data } = await supabase.rpc('get_milestone_standard_category', {
      p_component_type: componentType,
      p_milestone_name: milestoneName
    });
    return data;
  }

  // Get all components with progress
  const { data: components } = await supabase
    .from('components')
    .select('id, component_type, budgeted_manhours, current_milestones, area_id')
    .eq('project_id', projectId)
    .eq('is_retired', false)
    .not('area_id', 'is', null);

  console.log('\nCalculating current totals from components.current_milestones...');

  let totalBudget = 0;
  const currentByCategory = { receive: 0, install: 0, punch: 0, test: 0, restore: 0 };

  // Cache categories
  const categoryCache = {};

  for (const c of components) {
    const mh = c.budgeted_manhours || 0;
    totalBudget += mh;

    const milestones = c.current_milestones || {};
    for (const [name, value] of Object.entries(milestones)) {
      if (value <= 0) continue;

      const cacheKey = c.component_type + '|' + name;
      if (!categoryCache[cacheKey]) {
        categoryCache[cacheKey] = await getCategory(c.component_type, name);
      }
      const category = categoryCache[cacheKey];
      if (!category) continue;

      const weight = getWeight(c.component_type, name);
      if (!weight) continue;

      const earnedMH = (value / 100) * mh * (weight / 100);
      currentByCategory[category] = (currentByCategory[category] || 0) + earnedMH;
    }
  }

  const currentTotal = Object.values(currentByCategory).reduce((a, b) => a + b, 0);

  console.log('\n=== CURRENT TOTALS ===');
  console.log('Budget:', totalBudget.toFixed(2), 'MH');
  console.log('Received:', currentByCategory.receive.toFixed(2), 'MH (' + (currentByCategory.receive/totalBudget*100).toFixed(2) + '%)');
  console.log('Installed:', currentByCategory.install.toFixed(2), 'MH (' + (currentByCategory.install/totalBudget*100).toFixed(2) + '%)');
  console.log('Punch:', currentByCategory.punch.toFixed(2), 'MH (' + (currentByCategory.punch/totalBudget*100).toFixed(2) + '%)');
  console.log('Test:', currentByCategory.test.toFixed(2), 'MH (' + (currentByCategory.test/totalBudget*100).toFixed(2) + '%)');
  console.log('Restore:', currentByCategory.restore.toFixed(2), 'MH (' + (currentByCategory.restore/totalBudget*100).toFixed(2) + '%)');
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

  console.log('\n=== DELTA (Last 30 Days) ===');
  console.log('Budget:', deltaBudget.toFixed(2), 'MH');
  console.log('Received:', deltaReceived.toFixed(2), 'MH (' + (deltaReceived/deltaBudget*100).toFixed(2) + '%)');
  console.log('Installed:', deltaInstalled.toFixed(2), 'MH (' + (deltaInstalled/deltaBudget*100).toFixed(2) + '%)');
  console.log('Punch:', deltaPunch.toFixed(2), 'MH (' + (deltaPunch/deltaBudget*100).toFixed(2) + '%)');
  console.log('Test:', deltaTest.toFixed(2), 'MH (' + (deltaTest/deltaBudget*100).toFixed(2) + '%)');
  console.log('Restore:', deltaRestore.toFixed(2), 'MH (' + (deltaRestore/deltaBudget*100).toFixed(2) + '%)');
  console.log('Total:', deltaTotal.toFixed(2), 'MH (' + (deltaTotal/deltaBudget*100).toFixed(2) + '%)');

  console.log('\n=== GAPS (Current - Delta) ===');
  console.log('Received Gap:', (currentByCategory.receive - deltaReceived).toFixed(2), 'MH');
  console.log('Installed Gap:', (currentByCategory.install - deltaInstalled).toFixed(2), 'MH');
  console.log('Punch Gap:', (currentByCategory.punch - deltaPunch).toFixed(2), 'MH');
  console.log('Test Gap:', (currentByCategory.test - deltaTest).toFixed(2), 'MH');
  console.log('Restore Gap:', (currentByCategory.restore - deltaRestore).toFixed(2), 'MH');
  console.log('Total Gap:', (currentTotal - deltaTotal).toFixed(2), 'MH');
}

compare();
