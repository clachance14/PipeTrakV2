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

  // Get all components with progress
  const { data: components } = await supabase
    .from('components')
    .select('id, component_type, percent_complete, budgeted_manhours, current_milestones, identity_key')
    .eq('project_id', projectId)
    .eq('is_retired', false)
    .gt('percent_complete', 0);

  console.log('\nComponents with percent_complete > 0:', components.length);

  // For each component, check if they have milestone_events
  let totalMissingMH = 0;
  const missing = [];

  for (const c of components) {
    const { data: events, error } = await supabase
      .from('milestone_events')
      .select('id, milestone_name, value')
      .eq('component_id', c.id);

    if (error) {
      console.log('Error fetching events for', c.id, error.message);
      continue;
    }

    const earnedMH = (c.percent_complete / 100) * (c.budgeted_manhours || 0);

    if (!events || events.length === 0) {
      totalMissingMH += earnedMH;
      const ik = c.identity_key || {};
      missing.push({
        type: c.component_type,
        name: ik.spool_id || ik.weld_number || ik.tag || c.id.slice(0,8),
        pct: c.percent_complete,
        mh: earnedMH,
        milestones: c.current_milestones
      });
    }
  }

  console.log('\n=== COMPONENTS WITH PROGRESS BUT NO MILESTONE_EVENTS ===');
  console.log('Count:', missing.length);
  console.log('Total MH not tracked in events:', totalMissingMH.toFixed(2));

  if (missing.length > 0) {
    console.log('\nDetails:');
    missing.forEach(m => {
      console.log('  ' + m.type + ' ' + m.name + ': ' + m.pct + '% = ' + m.mh.toFixed(2) + ' MH');
      console.log('    milestones:', JSON.stringify(m.milestones));
    });
  }
}

investigate();
