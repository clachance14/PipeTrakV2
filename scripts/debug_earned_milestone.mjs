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

  // Get a few components with Receive milestone complete
  const { data: components } = await supabase
    .from('components')
    .select('id, component_type, current_milestones, budgeted_manhours')
    .eq('project_id', projectId)
    .eq('is_retired', false)
    .limit(10);

  console.log('\n=== Testing calculate_earned_milestone_value ===');

  for (const c of components.slice(0, 5)) {
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

    console.log('\n' + c.component_type + ':');
    console.log('  milestones:', JSON.stringify(c.current_milestones));
    console.log('  received %:', receivePct);
    console.log('  installed %:', installPct);
  }
}

check();
