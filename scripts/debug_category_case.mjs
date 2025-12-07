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

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all events with their milestone_name and component_type
  const { data: events } = await supabase
    .from('milestone_events')
    .select('id, component_id, milestone_name, value, previous_value, components!inner(component_type, budgeted_manhours, area_id, project_id)')
    .eq('components.project_id', projectId)
    .eq('components.is_retired', false)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  console.log('Total events:', events.length);

  // Check standard_category for each unique combo
  const combos = new Map();
  events.forEach(e => {
    const key = e.components.component_type + '|' + e.milestone_name;
    if (!combos.has(key)) {
      combos.set(key, { type: e.components.component_type, name: e.milestone_name, count: 0, totalMH: 0 });
    }
    combos.get(key).count++;
    // Calculate potential MH contribution
    const mh = e.components.budgeted_manhours || 0;
    const netChange = Math.max((e.value || 0) - (e.previous_value || 0), 0);
    combos.get(key).totalMH += (netChange / 100) * mh;
  });

  console.log('\n=== STANDARD_CATEGORY CHECK (RPC behavior) ===');

  let includedMH = 0;
  let excludedMH = 0;

  for (const [key, data] of combos) {
    const { data: result } = await supabase.rpc('get_milestone_standard_category', {
      p_component_type: data.type,
      p_milestone_name: data.name
    });

    const category = result || 'NULL';
    const status = result ? 'INCLUDED' : 'EXCLUDED';

    if (result) {
      includedMH += data.totalMH;
    } else {
      excludedMH += data.totalMH;
    }

    console.log(status + ' | ' + data.type + '/' + data.name + ' -> ' + category + ' | events=' + data.count + ' | potential_mh=' + data.totalMH.toFixed(2));
  }

  console.log('\n=== SUMMARY ===');
  console.log('Included MH:', includedMH.toFixed(2));
  console.log('Excluded MH:', excludedMH.toFixed(2));
}

investigate();
