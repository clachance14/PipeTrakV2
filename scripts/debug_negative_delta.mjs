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
  // Get the Dark Knight project
  const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', '%Rail Car Loading%');
  if (!projects || projects.length === 0) {
    console.log('No project found');
    return;
  }
  const projectId = projects[0].id;
  console.log('Project:', projects[0].name, projectId);

  // Date range: Last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const now = new Date();
  console.log('\nDate range:', sevenDaysAgo.toISOString(), 'to', now.toISOString());

  // Get ALL milestone events in the last 7 days
  const { data: recentEvents, error } = await supabase
    .from('milestone_events')
    .select(`
      id,
      component_id,
      milestone_name,
      value,
      previous_value,
      created_at,
      action,
      components!inner(
        identity_key,
        component_type,
        system_id,
        systems(name)
      )
    `)
    .gte('created_at', sevenDaysAgo.toISOString())
    .lte('created_at', now.toISOString())
    .eq('components.project_id', projectId)
    .eq('components.is_retired', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
    return;
  }

  const eventCount = recentEvents ? recentEvents.length : 0;
  console.log('\nTotal milestone events in last 7 days:', eventCount);

  if (!recentEvents || recentEvents.length === 0) {
    console.log('\nNo events found - this means delta should be 0, not negative!');
    return;
  }

  // Group events by component + milestone
  const eventsByComponentMilestone = {};
  recentEvents.forEach(e => {
    const key = e.component_id + '|' + e.milestone_name;
    if (!eventsByComponentMilestone[key]) {
      eventsByComponentMilestone[key] = [];
    }
    eventsByComponentMilestone[key].push(e);
  });

  console.log('\nUnique component/milestone pairs with activity:', Object.keys(eventsByComponentMilestone).length);

  // Calculate net change for each pair
  let totalPositive = 0;
  let totalNegative = 0;
  const negativeChanges = [];

  Object.entries(eventsByComponentMilestone).forEach(([key, events]) => {
    // Sort by created_at
    events.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const first = events[0];
    const last = events[events.length - 1];

    // Net change
    const startValue = first.previous_value !== null ? first.previous_value : 0;
    const endValue = last.value !== null ? last.value : 0;
    const netChange = endValue - startValue;

    if (netChange > 0) {
      totalPositive += netChange;
    } else if (netChange < 0) {
      totalNegative += netChange;
      const identKey = first.components.identity_key;
      negativeChanges.push({
        component: identKey ? (identKey.spool_id || identKey.tag || first.component_id) : first.component_id,
        componentType: first.components.component_type,
        system: first.components.systems ? first.components.systems.name : 'Unknown',
        milestone: first.milestone_name,
        startValue,
        endValue,
        netChange,
        events: events.map(e => ({
          action: e.action,
          prev: e.previous_value,
          val: e.value,
          at: e.created_at
        }))
      });
    }
  });

  console.log('\nTotal positive changes:', totalPositive);
  console.log('Total negative changes:', totalNegative);
  console.log('Net change:', totalPositive + totalNegative);

  if (negativeChanges.length > 0) {
    console.log('\n=== NEGATIVE CHANGES (' + negativeChanges.length + ') ===');
    negativeChanges.forEach(nc => {
      console.log('\n  Component:', nc.component, '(' + nc.componentType + ')');
      console.log('  System:', nc.system);
      console.log('  Milestone:', nc.milestone);
      console.log('  Change:', nc.startValue, '->', nc.endValue, '=', nc.netChange);
      console.log('  Events:');
      nc.events.forEach(e => console.log('    ' + e.at + ': ' + e.action + ' ' + e.prev + ' -> ' + e.val));
    });
  }

  // Also call the RPC to see what it returns
  console.log('\n\n=== RPC OUTPUT ===');
  const { data: rpcData, error: rpcErr } = await supabase.rpc('get_progress_delta_by_dimension', {
    p_project_id: projectId,
    p_dimension: 'system',
    p_start_date: sevenDaysAgo.toISOString(),
    p_end_date: now.toISOString()
  });

  if (rpcErr) {
    console.log('RPC error:', rpcErr);
  } else {
    console.log('RPC results:');
    rpcData.forEach(row => {
      console.log('  ' + row.dimension_name + ': components=' + row.components_with_activity + ', mh_budget=' + row.mh_budget + ', delta_total=' + row.delta_total + '%, delta_mh_earned=' + row.delta_total_mh_earned);
    });
  }
}

investigate();
