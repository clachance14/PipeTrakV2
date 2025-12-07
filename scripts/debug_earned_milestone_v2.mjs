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

  // Get components WITH progress
  const { data: components } = await supabase
    .from('components')
    .select('id, component_type, current_milestones, budgeted_manhours, percent_complete')
    .eq('project_id', projectId)
    .eq('is_retired', false)
    .gt('percent_complete', 0)
    .limit(20);

  console.log('\n=== Testing calculate_earned_milestone_value ===');

  // Group by component_type
  const byType = {};
  for (const c of components) {
    if (!byType[c.component_type]) byType[c.component_type] = [];
    byType[c.component_type].push(c);
  }

  for (const [type, comps] of Object.entries(byType)) {
    console.log('\n' + type.toUpperCase() + ':');
    for (const c of comps.slice(0, 2)) {
      const { data: receivePct } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: c.component_type,
        p_milestones: c.current_milestones,
        p_category: 'received'
      });

      const { data: installPct } = await supabase.rpc('calculate_earned_milestone_value', {
        p_component_type: c.component_type,
        p_milestones: c.current_milestones,
        p_category: 'installed'
      });

      console.log('  milestones:', JSON.stringify(c.current_milestones));
      console.log('  percent_complete:', c.percent_complete);
      console.log('  received %:', receivePct);
      console.log('  installed %:', installPct);
    }
  }

  // Now let's calculate what the view would produce
  console.log('\n=== SIMULATING VIEW CALCULATION ===');

  // Get all components with area
  const { data: allComps } = await supabase
    .from('components')
    .select('id, component_type, current_milestones, budgeted_manhours, percent_complete')
    .eq('project_id', projectId)
    .eq('is_retired', false)
    .not('area_id', 'is', null);

  let totalMH = 0;
  let receiveBudget = 0;
  let receiveEarned = 0;
  let installBudget = 0;
  let installEarned = 0;
  let totalEarned = 0;

  for (const c of allComps) {
    const mh = c.budgeted_manhours || 0;
    totalMH += mh;

    // View hardcoded weights
    let receiveW = 0;
    let installW = 0;

    if (c.component_type === 'spool') {
      receiveW = 0.05;
      installW = 0.80;
    } else if (c.component_type === 'field_weld') {
      receiveW = 0;
      installW = 0.95;
    } else {
      receiveW = 0.10;
      installW = 0.60;
    }

    const { data: receivePct } = await supabase.rpc('calculate_earned_milestone_value', {
      p_component_type: c.component_type,
      p_milestones: c.current_milestones,
      p_category: 'received'
    });

    const { data: installPct } = await supabase.rpc('calculate_earned_milestone_value', {
      p_component_type: c.component_type,
      p_milestones: c.current_milestones,
      p_category: 'installed'
    });

    receiveBudget += mh * receiveW;
    receiveEarned += mh * receiveW * (receivePct || 0) / 100;
    installBudget += mh * installW;
    installEarned += mh * installW * (installPct || 0) / 100;
    totalEarned += mh * (c.percent_complete || 0) / 100;
  }

  console.log('Total MH Budget:', totalMH.toFixed(2));
  console.log('Receive Budget:', receiveBudget.toFixed(2), '-> Earned:', receiveEarned.toFixed(2));
  console.log('Install Budget:', installBudget.toFixed(2), '-> Earned:', installEarned.toFixed(2));
  console.log('Total Earned:', totalEarned.toFixed(2));
  console.log('Receive %:', (receiveEarned / receiveBudget * 100).toFixed(1) + '%');
  console.log('Install %:', (installEarned / installBudget * 100).toFixed(1) + '%');
}

check();
