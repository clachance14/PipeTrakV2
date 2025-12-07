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

  // Find a field weld that shows 100% but has events for only 70%
  const { data: components } = await supabase
    .from('components')
    .select('id, identity_key, percent_complete, current_milestones')
    .eq('project_id', projectId)
    .eq('component_type', 'field_weld')
    .eq('percent_complete', 100)
    .limit(5);

  for (const c of components) {
    const weldNum = c.identity_key?.weld_number;
    console.log('\n=== Field Weld #' + weldNum + ' (100% complete) ===');
    console.log('current_milestones:', JSON.stringify(c.current_milestones));

    // Get all events for this weld
    const { data: events } = await supabase
      .from('milestone_events')
      .select('milestone_name, value, previous_value, created_at')
      .eq('component_id', c.id)
      .order('created_at', { ascending: true });

    console.log('\nAll events (' + events.length + '):');
    events.forEach(e => {
      console.log('  ' + e.created_at + ' | ' + e.milestone_name + ': ' + e.previous_value + ' -> ' + e.value);
    });

    // Check what milestones are in events
    const eventMilestones = [...new Set(events.map(e => e.milestone_name))];
    const currentMilestones = Object.keys(c.current_milestones);
    console.log('\nMilestones in events:', eventMilestones.join(', '));
    console.log('Milestones in current:', currentMilestones.join(', '));

    // Find missing
    const missing = currentMilestones.filter(m => {
      const val = c.current_milestones[m];
      return val > 0 && !eventMilestones.includes(m);
    });
    console.log('Missing from events:', missing.join(', ') || 'none');
  }
}

investigate();
