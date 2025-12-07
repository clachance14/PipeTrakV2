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
  const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', '%Rail Car Loading%');
  const projectId = projects[0].id;
  console.log('Project:', projects[0].name);

  // Get templates
  const { data: templates } = await supabase
    .from('progress_templates')
    .select('component_type, milestones_config')
    .eq('version', 1);

  const weightsByType = {};
  templates.forEach(t => {
    weightsByType[t.component_type] = {};
    t.milestones_config.forEach(m => {
      weightsByType[t.component_type][m.name.toLowerCase()] = m.weight;
    });
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all events in range
  const { data: events } = await supabase
    .from('milestone_events')
    .select('id, component_id, milestone_name, value, previous_value, created_at, components!inner(component_type, budgeted_manhours, area_id, project_id)')
    .eq('components.project_id', projectId)
    .eq('components.is_retired', false)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  console.log('Total events in range:', events.length);

  // Group by component_id + milestone_name
  const groups = {};
  events.forEach(e => {
    const key = e.component_id + '|' + e.milestone_name;
    if (!groups[key]) {
      groups[key] = {
        component_id: e.component_id,
        milestone_name: e.milestone_name,
        component_type: e.components.component_type,
        budgeted_mh: e.components.budgeted_manhours || 0,
        area_id: e.components.area_id,
        events: []
      };
    }
    groups[key].events.push(e);
  });

  console.log('Unique component/milestone pairs:', Object.keys(groups).length);

  // Calculate delta for each
  let totalDeltaMH = 0;
  let skippedNoArea = 0;
  let skippedNoWeight = 0;

  const byType = {};

  Object.values(groups).forEach(g => {
    // Check area
    if (!g.area_id) {
      skippedNoArea++;
      return;
    }

    // Get weight
    const typeWeights = weightsByType[g.component_type] || {};
    const weight = typeWeights[g.milestone_name.toLowerCase()];
    if (!weight) {
      skippedNoWeight++;
      return;
    }

    // First and last event
    const first = g.events[0];
    const last = g.events[g.events.length - 1];

    const startVal = first.previous_value || 0;
    const endVal = last.value || 0;
    const netChange = Math.max(endVal - startVal, 0);

    // Calculate MH
    const deltaMH = (netChange / 100) * g.budgeted_mh * (weight / 100);
    totalDeltaMH += deltaMH;

    if (!byType[g.component_type]) byType[g.component_type] = 0;
    byType[g.component_type] += deltaMH;
  });

  console.log('\n=== MANUAL CALCULATION ===');
  console.log('Total delta MH:', totalDeltaMH.toFixed(2));
  console.log('Skipped (no area_id):', skippedNoArea);
  console.log('Skipped (no weight):', skippedNoWeight);

  console.log('\n=== BY COMPONENT TYPE ===');
  Object.entries(byType).forEach(([type, mh]) => {
    console.log('  ' + type + ':', mh.toFixed(2), 'MH');
  });

  // Compare to RPC
  const { data: rpcData } = await supabase.rpc('get_progress_delta_by_dimension', {
    p_project_id: projectId,
    p_dimension: 'area',
    p_start_date: thirtyDaysAgo.toISOString(),
    p_end_date: new Date().toISOString()
  });

  let rpcTotal = 0;
  rpcData.forEach(r => rpcTotal += parseFloat(r.delta_total_mh_earned) || 0);

  console.log('\n=== RPC RESULT ===');
  console.log('RPC delta MH:', rpcTotal.toFixed(2));
  console.log('Gap:', (totalDeltaMH - rpcTotal).toFixed(2), 'MH');
}

investigate();
