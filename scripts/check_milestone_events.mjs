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

async function checkData() {
  // Get the Dark Knight project (the active one)
  const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', '%Rail Car Loading%');
  console.log('Projects:', projects);

  if (!projects || projects.length === 0) return;
  const projectId = projects[0].id;
  console.log('\nUsing project:', projectId);

  // Get component IDs for this project
  const { data: componentIds } = await supabase
    .from('components')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_retired', false)
    .neq('component_type', 'field_weld');

  const ids = componentIds?.map(c => c.id) || [];
  console.log(`\nFound ${ids.length} components`);

  if (ids.length === 0) return;

  // Use a simpler approach - join through RPC or just sample a few IDs
  const sampleIds = ids.slice(0, 50);

  // Check milestone_events date range for these components
  const { data: events, error } = await supabase
    .from('milestone_events')
    .select('created_at, milestone_name, value, previous_value, component_id')
    .in('component_id', sampleIds)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nLatest milestone_events (sample):');
  events.forEach(e => console.log(`  ${e.created_at} - ${e.milestone_name}: ${e.previous_value} -> ${e.value}`));

  // Get date range with just one sample
  const { data: dateRange } = await supabase
    .from('milestone_events')
    .select('created_at')
    .in('component_id', sampleIds)
    .order('created_at', { ascending: true })
    .limit(1);

  const { data: dateRangeMax } = await supabase
    .from('milestone_events')
    .select('created_at')
    .in('component_id', sampleIds)
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('\nEarliest event (sample):', dateRange?.[0]?.created_at);
  console.log('Latest event (sample):', dateRangeMax?.[0]?.created_at);

  // Count events by date bucket
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  console.log('\n30 days ago:', thirtyDaysAgo.toISOString());

  const { count: last30Days } = await supabase
    .from('milestone_events')
    .select('*', { count: 'exact', head: true })
    .in('component_id', sampleIds)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const { count: total } = await supabase
    .from('milestone_events')
    .select('*', { count: 'exact', head: true })
    .in('component_id', sampleIds);

  console.log('\nEvents in last 30 days (sample of 50 components):', last30Days);
  console.log('Total events (sample of 50 components):', total);

  // Check current component progress from components table
  const { data: rawComponents, error: rawErr } = await supabase
    .from('components')
    .select('id, identity_key, component_type, percent_complete, current_milestones')
    .eq('project_id', projectId)
    .eq('is_retired', false)
    .neq('component_type', 'field_weld')
    .limit(10);

  console.log('\nSample components:', rawErr ? rawErr : `count=${rawComponents?.length || 0}`);
  if (rawComponents && rawComponents.length > 0) {
    rawComponents.forEach(c => {
      const ident = c.identity_key?.spool_id || c.identity_key?.tag || JSON.stringify(c.identity_key);
      console.log(`  ${ident} (${c.component_type}): %=${c.percent_complete}, milestones=${JSON.stringify(c.current_milestones)}`);
    });
  } else {
    console.log('No components found or error');
  }

  // Calculate what current progress should be
  const { data: allComponents } = await supabase
    .from('components')
    .select('percent_complete')
    .eq('project_id', projectId)
    .eq('is_retired', false)
    .neq('component_type', 'field_weld');

  const avgProgress = allComponents?.reduce((sum, c) => sum + (c.percent_complete || 0), 0) / (allComponents?.length || 1);
  console.log('\nCurrent average progress across all components:', avgProgress.toFixed(2) + '%');
  console.log('This is what the delta should show if going from 0% to current');

  // Now let's look at milestone events distribution across ALL component ids
  // by querying the events through a different approach
  const { data: eventStats, error: eventErr } = await supabase.rpc('get_milestone_event_stats', {
    p_project_id: projectId
  });

  if (eventErr) {
    console.log('\nNo get_milestone_event_stats RPC, checking directly...');

    // Count components with any milestones set
    const { data: milestonesComponents } = await supabase
      .from('components')
      .select('id, current_milestones')
      .eq('project_id', projectId)
      .eq('is_retired', false)
      .neq('component_type', 'field_weld')
      .neq('current_milestones', '{}');

    console.log('Components with any milestones set:', milestonesComponents?.length || 0);
    if (milestonesComponents && milestonesComponents.length > 0) {
      console.log('Sample milestones:', milestonesComponents.slice(0, 5).map(c => JSON.stringify(c.current_milestones)));
    }

    // Call the actual RPC to see what it returns
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const now = new Date();

    console.log('\nCalling get_progress_delta_by_dimension RPC...');
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_progress_delta_by_dimension', {
      p_project_id: projectId,
      p_dimension: 'system',
      p_start_date: thirtyDaysAgo.toISOString(),
      p_end_date: now.toISOString()
    });

    if (rpcErr) {
      console.log('RPC error:', rpcErr);
    } else {
      console.log('RPC results:');
      rpcData?.forEach(row => {
        console.log(`  ${row.dimension_name}: active=${row.components_with_activity}, mh_budget(=total_components)=${row.mh_budget}, delta_total=${row.delta_total}, delta_received=${row.delta_received}`);
      });
    }

    // Get total components per system
    const { data: systemCounts } = await supabase
      .from('components')
      .select('system_id, systems(name)')
      .eq('project_id', projectId)
      .eq('is_retired', false)
      .neq('component_type', 'field_weld');

    // Group by system
    const systemStats = {};
    systemCounts?.forEach(c => {
      const sysName = c.systems?.name || 'Unknown';
      if (!systemStats[sysName]) systemStats[sysName] = { total: 0, withProgress: 0 };
      systemStats[sysName].total++;
    });

    console.log('\nComponent counts per system:', systemStats);
  } else {
    console.log('\nEvent stats:', eventStats);
  }
}

checkData();
