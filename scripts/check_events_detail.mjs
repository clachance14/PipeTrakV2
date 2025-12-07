import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '', supabaseKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

// The project ID from screenshot
const projectId = 'e34ca1d2-b740-4294-b17c-96fdbc187058';

// Get all milestone events in last 30 days for this project
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const { data: events, error } = await supabase
  .from('milestone_events')
  .select('id, milestone_name, action, value, previous_value, created_at, component_id')
  .gte('created_at', thirtyDaysAgo.toISOString())
  .order('created_at', { ascending: false })
  .limit(50);

if (error) { console.error(error); process.exit(1); }

console.log('All milestone events in last 30 days:', events.length);

// Check which belong to this project
let projectEvents = [];
for (const e of events) {
  const { data: comp } = await supabase
    .from('components')
    .select('id, component_id, component_type, project_id')
    .eq('id', e.component_id)
    .single();
  
  if (comp && comp.project_id === projectId) {
    projectEvents.push({ ...e, component: comp });
  }
}

console.log('Events for project 6074:', projectEvents.length);
projectEvents.forEach(e => {
  console.log('  ' + e.created_at.substring(0,19) + ': ' + e.component.component_type + ' - ' + e.milestone_name + ': ' + e.previous_value + ' -> ' + e.value);
});

// Also check current threaded_pipe progress
console.log('\nThreaded pipe components with non-zero percent_complete:');
const { data: pipes } = await supabase
  .from('components')
  .select('component_id, percent_complete, current_milestones')
  .eq('project_id', projectId)
  .eq('component_type', 'threaded_pipe')
  .gt('percent_complete', 0)
  .limit(10);

if (pipes && pipes.length > 0) {
  pipes.forEach(p => console.log('  ' + p.component_id + ': ' + p.percent_complete + '%'));
} else {
  console.log('  None found - all threaded pipes are at 0%');
}
