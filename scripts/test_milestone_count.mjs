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
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

// Direct SQL query to count milestone_events for this project
const { data: meCount, error: meErr } = await supabase
  .from('milestone_events')
  .select('id, component_id, created_at')
  .gte('created_at', thirtyDaysAgo.toISOString());

console.log('All milestone_events in last 30 days:', meCount?.length || 0);

// Filter to project
let projectEventCount = 0;
if (meCount) {
  for (const e of meCount) {
    const { data: comp } = await supabase
      .from('components')
      .select('project_id')
      .eq('id', e.component_id)
      .single();
    if (comp?.project_id === projectId) {
      projectEventCount++;
      console.log('Found event for project 6074:', e.id, e.created_at);
    }
  }
}
console.log('\nTotal events for project 6074 in last 30 days:', projectEventCount);

// Test RPC again
const { data: rpcData, error: rpcErr } = await supabase.rpc('get_progress_delta_by_dimension', {
  p_project_id: projectId,
  p_dimension: 'system',
  p_start_date: thirtyDaysAgo.toISOString(),
  p_end_date: new Date().toISOString()
});

if (rpcErr) console.log('RPC Error:', rpcErr);
console.log('\nRPC returned', rpcData?.length || 0, 'rows');
if (rpcData) {
  rpcData.forEach(r => console.log('  ' + r.dimension_name + ': delta_install=' + r.delta_install_mh_earned + ', pct=' + r.delta_mh_pct_complete + '%'));
}
