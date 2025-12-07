import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env vars
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

// Find the Dark Knight project
const { data: projects } = await supabase
  .from('projects')
  .select('id, name');

console.log('Projects:', projects.map(p => p.name));

const project = projects.find(p => p.name.includes('6074'));
if (!project) {
  console.log('Dark Knight project not found');
  process.exit(1);
}

console.log('\nProject:', project.name, project.id);

// Find Air system
const { data: systems } = await supabase
  .from('systems')
  .select('id, name')
  .eq('project_id', project.id);

console.log('Systems:', systems.map(s => s.name));

const airSystem = systems.find(s => s.name.toLowerCase().includes('air'));
if (!airSystem) {
  console.log('Air system not found');
  process.exit(1);
}

console.log('\nAir System:', airSystem.name, airSystem.id);

// Get components in Air system
const { data: airComponents } = await supabase
  .from('components')
  .select('id, component_id, component_type, budgeted_manhours, percent_complete')
  .eq('system_id', airSystem.id)
  .eq('is_retired', false)
  .limit(10);

console.log('\nAir components (sample):');
if (airComponents) {
  airComponents.forEach(c => {
    console.log('  ' + c.component_id + ' (' + c.component_type + ') - MH: ' + c.budgeted_manhours + ', %: ' + c.percent_complete);
  });
}

// Get milestone events in last 30 days for Air system components
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

// First get component IDs in Air system
const { data: allAirComponents } = await supabase
  .from('components')
  .select('id')
  .eq('system_id', airSystem.id)
  .eq('is_retired', false);

const componentIds = allAirComponents.map(c => c.id);
console.log('\nTotal Air components:', componentIds.length);

const { data: events, error } = await supabase
  .from('milestone_events')
  .select('id, milestone_name, action, value, previous_value, created_at, component_id')
  .in('component_id', componentIds)
  .gte('created_at', thirtyDaysAgo.toISOString())
  .order('created_at', { ascending: false })
  .limit(20);

if (error) {
  console.error('Error:', error);
} else {
  console.log('\nMilestone events in last 30 days for Air system: ' + (events ? events.length : 0));
  if (events && events.length > 0) {
    for (const e of events) {
      // Get component info
      const comp = airComponents.find(c => c.id === e.component_id);
      const compType = comp ? comp.component_type : 'unknown';
      console.log('  ' + e.created_at.substring(0, 19) + ': ' + compType + ' ' + e.milestone_name + ' (' + e.action + '): ' + e.previous_value + ' -> ' + e.value);
    }
  } else {
    console.log('  No events found!');
  }
}

// Also check project_progress_templates for threaded_pipe Fabricate weight
console.log('\nChecking milestone weights for threaded_pipe Fabricate:');
const { data: weights } = await supabase
  .from('project_progress_templates')
  .select('milestone_name, weight')
  .eq('project_id', project.id)
  .eq('component_type', 'threaded_pipe');

if (weights && weights.length > 0) {
  weights.forEach(w => console.log('  ' + w.milestone_name + ': ' + w.weight + '%'));
} else {
  console.log('  No project templates found, checking system templates...');
  const { data: sysTemplates } = await supabase
    .from('progress_templates')
    .select('component_type, milestones_config')
    .eq('component_type', 'threaded_pipe')
    .eq('version', 1);
  if (sysTemplates && sysTemplates[0]) {
    const config = sysTemplates[0].milestones_config;
    config.forEach(m => console.log('  ' + m.name + ': ' + m.weight + '%'));
  }
}
