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

// Get components with non-zero percent_complete
const { data: comps } = await supabase
  .from('components')
  .select('id, component_id, component_type, system_id, percent_complete')
  .eq('project_id', projectId)
  .gt('percent_complete', 0)
  .limit(20);

console.log('Components with percent_complete > 0:', comps?.length || 0);
if (comps) {
  for (const c of comps) {
    const { data: sys } = await supabase.from('systems').select('name').eq('id', c.system_id).single();
    console.log('  ' + c.component_id + ' (' + c.component_type + ') - ' + (sys?.name || 'no system') + ': ' + c.percent_complete + '%');
  }
}

// Count by system
const { data: allComps } = await supabase
  .from('components')
  .select('system_id, percent_complete')
  .eq('project_id', projectId)
  .gt('percent_complete', 0);

const bySys = {};
allComps?.forEach(c => {
  bySys[c.system_id] = (bySys[c.system_id] || 0) + 1;
});
console.log('\nComponents with progress by system_id:');
for (const [sid, count] of Object.entries(bySys)) {
  const { data: sys } = await supabase.from('systems').select('name').eq('id', sid).single();
  console.log('  ' + (sys?.name || sid) + ': ' + count + ' components');
}
