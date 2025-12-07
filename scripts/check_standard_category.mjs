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

  // Get unique milestone names from events
  const { data: events } = await supabase
    .from('milestone_events')
    .select('milestone_name, components!inner(component_type, project_id)')
    .eq('components.project_id', projectId);

  // Get unique combinations
  const combos = new Map();
  events.forEach(e => {
    const key = e.components.component_type + '|' + e.milestone_name;
    if (!combos.has(key)) {
      combos.set(key, { type: e.components.component_type, name: e.milestone_name, count: 0 });
    }
    combos.get(key).count++;
  });

  // Check which have standard_category
  console.log('\n=== MILESTONE STANDARD CATEGORY CHECK ===');

  for (const [key, data] of combos) {
    const { data: result } = await supabase.rpc('get_milestone_standard_category', {
      p_component_type: data.type,
      p_milestone_name: data.name
    });

    const category = result || 'NULL';
    const status = result ? '✓' : '✗ EXCLUDED';
    console.log(status + ' ' + data.type + '/' + data.name + ' -> ' + category + ' (' + data.count + ' events)');
  }
}

investigate();
