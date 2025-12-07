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
  const { data: projects } = await supabase.from('projects').select('id, name, created_at').ilike('name', '%Rail Car Loading%');
  const projectId = projects[0].id;
  console.log('Project:', projects[0].name);
  console.log('Created:', projects[0].created_at);

  // Current earned MH from components
  const { data: components } = await supabase
    .from('components')
    .select('id, component_type, percent_complete, budgeted_manhours, current_milestones')
    .eq('project_id', projectId)
    .eq('is_retired', false);

  let currentEarnedMH = 0;
  let currentBudgetMH = 0;
  components.forEach(c => {
    const mh = c.budgeted_manhours || 0;
    const pct = c.percent_complete || 0;
    currentBudgetMH += mh;
    currentEarnedMH += (pct / 100) * mh;
  });

  console.log('\n=== CURRENT STATE (from components.percent_complete) ===');
  console.log('Budget MH:', currentBudgetMH.toFixed(2));
  console.log('Earned MH:', currentEarnedMH.toFixed(2));
  console.log('% Complete:', ((currentEarnedMH / currentBudgetMH) * 100).toFixed(2) + '%');

  // Delta from RPC (30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const now = new Date();

  const { data: deltaData } = await supabase.rpc('get_progress_delta_by_dimension', {
    p_project_id: projectId,
    p_dimension: 'area',
    p_start_date: thirtyDaysAgo.toISOString(),
    p_end_date: now.toISOString()
  });

  let deltaEarnedMH = 0;
  deltaData.forEach(row => {
    deltaEarnedMH += parseFloat(row.delta_total_mh_earned) || 0;
  });

  console.log('\n=== DELTA (from milestone_events in last 30 days) ===');
  console.log('Delta MH Earned:', deltaEarnedMH.toFixed(2));
  console.log('Delta % Complete:', ((deltaEarnedMH / currentBudgetMH) * 100).toFixed(2) + '%');

  console.log('\n=== GAP ===');
  const gap = currentEarnedMH - deltaEarnedMH;
  console.log('Current - Delta:', gap.toFixed(2), 'MH');
  console.log('This represents progress NOT captured in milestone_events');

  // Find components with progress but no milestone_events
  console.log('\n=== INVESTIGATING GAP ===');

  // Get all milestone_events for this project
  const { data: events } = await supabase
    .from('milestone_events')
    .select('component_id, milestone_name, value')
    .in('component_id', components.map(c => c.id));

  const componentsWithEvents = new Set(events.map(e => e.component_id));

  // Find components with percent_complete > 0 but no events
  const missingEvents = components.filter(c =>
    c.percent_complete > 0 && !componentsWithEvents.has(c.id)
  );

  if (missingEvents.length > 0) {
    console.log('\nComponents with progress but NO milestone_events:', missingEvents.length);
    let missingMH = 0;
    missingEvents.slice(0, 10).forEach(c => {
      const earned = (c.percent_complete / 100) * (c.budgeted_manhours || 0);
      missingMH += earned;
      console.log('  ' + c.component_type + ': ' + c.percent_complete + '% = ' + earned.toFixed(2) + ' MH');
      console.log('    milestones:', JSON.stringify(c.current_milestones));
    });
    console.log('Total missing MH from these:', missingMH.toFixed(2));
  }

  // Check if delta calculation is missing some event types
  const byType = {};
  components.forEach(c => {
    if (!byType[c.component_type]) byType[c.component_type] = { current: 0, count: 0 };
    byType[c.component_type].current += (c.percent_complete / 100) * (c.budgeted_manhours || 0);
    byType[c.component_type].count++;
  });

  console.log('\n=== BY COMPONENT TYPE ===');
  Object.entries(byType).forEach(([type, data]) => {
    console.log(type + ': ' + data.current.toFixed(2) + ' MH earned (' + data.count + ' components)');
  });
}

investigate();
