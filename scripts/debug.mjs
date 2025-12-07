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

// Get sample component
const { data: sample } = await supabase
  .from('components')
  .select('id, component_id, percent_complete, current_milestones')
  .eq('project_id', projectId)
  .not('percent_complete', 'is', null)
  .limit(5);

console.log('Sample components:');
sample?.forEach(c => {
  console.log('  ' + c.component_id + ': percent_complete=' + c.percent_complete + ', milestones=' + JSON.stringify(c.current_milestones));
});

// Check what percent_complete values exist
const { data: pcts } = await supabase.rpc('sql', {
  query: `SELECT DISTINCT percent_complete FROM components WHERE project_id = '${projectId}' ORDER BY percent_complete`
});
console.log('\nDistinct percent_complete values:', pcts);
