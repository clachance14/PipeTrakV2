import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '', supabaseKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const projectId = 'e34ca1d2-b740-4294-b17c-96fdbc187058';

// Get component IDs for this project
const { data: comps } = await supabase
  .from('components')
  .select('id')
  .eq('project_id', projectId);

const compIds = comps.map(c => c.id);
console.log('Total components in project 6074:', compIds.length);

// Get ALL events for these components
const { data: events, count } = await supabase
  .from('milestone_events')
  .select('id, milestone_name, created_at', { count: 'exact' })
  .in('component_id', compIds);

console.log('Total milestone_events for this project:', count || events?.length || 0);

if (events && events.length > 0) {
  // Group by date
  const byDate = {};
  events.forEach(e => {
    const date = e.created_at.substring(0, 10);
    byDate[date] = (byDate[date] || 0) + 1;
  });
  console.log('\nEvents by date:');
  Object.keys(byDate).sort().forEach(d => console.log('  ' + d + ': ' + byDate[d] + ' events'));
}
