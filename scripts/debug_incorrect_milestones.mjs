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

  // Find field_welds that have Test/Punch/Restore=100 in current_milestones
  const { data: components } = await supabase
    .from('components')
    .select('id, identity_key, percent_complete, current_milestones')
    .eq('project_id', projectId)
    .eq('component_type', 'field_weld')
    .not('current_milestones', 'is', null);

  console.log('\nField weld components:', components.length);

  let wrongCount = 0;
  const wrongWelds = [];

  for (const c of components) {
    const milestones = c.current_milestones || {};
    const hasWrongMilestones =
      (milestones['Test'] && milestones['Test'] > 0) ||
      (milestones['Punch'] && milestones['Punch'] > 0) ||
      (milestones['Restore'] && milestones['Restore'] > 0);

    if (hasWrongMilestones) {
      wrongCount++;
      wrongWelds.push({
        id: c.id,
        weldNum: c.identity_key?.weld_number,
        pct: c.percent_complete,
        milestones: c.current_milestones
      });
    }
  }

  console.log('\n=== WELDS WITH INCORRECT MILESTONES ===');
  console.log('Count:', wrongCount);

  wrongWelds.slice(0, 10).forEach(w => {
    console.log('\n  Weld #' + w.weldNum + ' (' + w.pct + '%):');
    console.log('    ' + JSON.stringify(w.milestones));
  });

  if (wrongWelds.length > 10) {
    console.log('\n  ... and ' + (wrongWelds.length - 10) + ' more');
  }

  // What should the correct milestones be based on milestone_events?
  console.log('\n=== CORRECT STATE FROM EVENTS ===');
  for (const w of wrongWelds.slice(0, 3)) {
    console.log('\nWeld #' + w.weldNum + ':');
    const { data: events } = await supabase
      .from('milestone_events')
      .select('milestone_name, value')
      .eq('component_id', w.id)
      .order('created_at', { ascending: false });

    // Get latest value for each milestone
    const latest = {};
    events.forEach(e => {
      if (!latest[e.milestone_name]) {
        latest[e.milestone_name] = e.value;
      }
    });

    console.log('  From events:', JSON.stringify(latest));
    console.log('  In current_milestones:', JSON.stringify(w.milestones));
  }
}

investigate();
