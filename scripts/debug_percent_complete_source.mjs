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

  // The question: what is components.percent_complete calculated from?
  // It should be recalculated from current_milestones

  // Check the calculate_component_percent function
  console.log('\n=== Checking how percent_complete is calculated ===');

  // Get a sample weld with 100% complete
  const { data: welds } = await supabase
    .from('components')
    .select('id, percent_complete, current_milestones, budgeted_manhours, identity_key')
    .eq('project_id', projectId)
    .eq('component_type', 'field_weld')
    .eq('percent_complete', 100)
    .limit(5);

  console.log('\nField welds with percent_complete=100:');
  welds.forEach(w => {
    const ik = w.identity_key || {};
    console.log('  Weld', ik.weld_number || w.id, ':');
    console.log('    percent_complete:', w.percent_complete);
    console.log('    current_milestones:', JSON.stringify(w.current_milestones));
  });

  // The problem: current_milestones uses Fit-up/Weld Complete
  // But progress_templates uses Fit-Up/Weld Made
  // So when calculate_component_percent runs, it can't find the weights!

  // Check if there's a calculate function
  const { data: funcDef, error } = await supabase.rpc('calculate_component_percent', {
    p_component_id: welds[0].id
  });

  console.log('\n=== Testing calculate_component_percent ===');
  console.log('For component', welds[0].id);
  console.log('Result:', funcDef);
  if (error) console.log('Error:', error.message);

  // Let's manually calculate what it SHOULD be
  const { data: templates } = await supabase
    .from('progress_templates')
    .select('milestones_config')
    .eq('component_type', 'field_weld')
    .eq('version', 1)
    .single();

  console.log('\n=== Progress template for field_weld ===');
  console.log(JSON.stringify(templates.milestones_config, null, 2));
}

investigate();
