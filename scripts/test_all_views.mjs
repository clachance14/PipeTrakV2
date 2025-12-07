import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseAnonKey = '';

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim();
  }
  if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = trimmed.substring('VITE_SUPABASE_ANON_KEY='.length).trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const projectId = 'e34ca1d2-b740-4294-b17c-96fdbc187058';

console.log('Testing all manhour views for project:', projectId);

// Test area view
console.log('\n--- Area View ---');
const { data: areaData, error: areaError } = await supabase
  .from('vw_manhour_progress_by_area')
  .select('*')
  .eq('project_id', projectId)
  .order('area_name', { ascending: true });
if (areaError) console.error('Error:', areaError);
else console.log('Rows:', areaData?.length);

// Test system view
console.log('\n--- System View ---');
const { data: systemData, error: systemError } = await supabase
  .from('vw_manhour_progress_by_system')
  .select('*')
  .eq('project_id', projectId)
  .order('system_name', { ascending: true });
if (systemError) console.error('Error:', systemError);
else console.log('Rows:', systemData?.length);

// Test test_package view
console.log('\n--- Test Package View ---');
const { data: tpData, error: tpError } = await supabase
  .from('vw_manhour_progress_by_test_package')
  .select('*')
  .eq('project_id', projectId)
  .order('test_package_name', { ascending: true });
if (tpError) console.error('Error:', tpError);
else console.log('Rows:', tpData?.length);

// Show sample data
if (tpData && tpData.length > 0) {
  console.log('\nSample row:', JSON.stringify(tpData[0], null, 2));
}
