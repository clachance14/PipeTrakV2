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
const now = new Date();

console.log('Calling RPC for project 6074...');
console.log('Date range:', thirtyDaysAgo.toISOString(), 'to', now.toISOString());

const { data, error } = await supabase.rpc('get_progress_delta_by_dimension', {
  p_project_id: projectId,
  p_dimension: 'system',
  p_start_date: thirtyDaysAgo.toISOString(),
  p_end_date: now.toISOString()
});

if (error) { console.error('RPC Error:', error); process.exit(1); }

console.log('\nRPC returned', data.length, 'rows:');
data.forEach(r => {
  console.log('  ' + r.dimension_name + ': mh_budget=' + r.mh_budget + ', delta_install=' + r.delta_install_mh_earned + ', delta_total=' + r.delta_mh_pct_complete + '%');
});
