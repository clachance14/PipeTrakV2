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

  // Find the spool with the gap
  const { data: spools } = await supabase
    .from('components')
    .select('id, identity_key, percent_complete, current_milestones, budgeted_manhours')
    .eq('project_id', projectId)
    .eq('component_type', 'spool')
    .ilike('identity_key->>spool_id', '%SPOOL1%');

  for (const spool of spools) {
    const spoolId = spool.identity_key?.spool_id;
    console.log('\n=== Spool ' + spoolId + ' ===');
    console.log('percent_complete:', spool.percent_complete);
    console.log('budgeted_manhours:', spool.budgeted_manhours);
    console.log('current_milestones:', JSON.stringify(spool.current_milestones));

    // Get events
    const { data: events } = await supabase
      .from('milestone_events')
      .select('milestone_name, value, previous_value, created_at')
      .eq('component_id', spool.id)
      .order('created_at', { ascending: true });

    console.log('\nAll events (' + events.length + '):');
    events.forEach(e => {
      console.log('  ' + e.created_at + ' | ' + e.milestone_name + ': ' + e.previous_value + ' -> ' + e.value);
    });

    // Get weights for spool
    const { data: projTemplates } = await supabase
      .from('project_progress_templates')
      .select('milestone_name, weight')
      .eq('project_id', projectId)
      .eq('component_type', 'spool');

    console.log('\nProject template weights:');
    projTemplates.forEach(pt => {
      console.log('  ' + pt.milestone_name + ': ' + pt.weight + '%');
    });
  }
}

investigate();
