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
const projectId = '00771244-552e-4b07-bf44-819b1a9ca7a4';  // Demo project

console.log('Testing demo project:', projectId);

console.log('\n--- Area View ---');
const { data: areaData, error: areaError } = await supabase
  .from('vw_manhour_progress_by_area')
  .select('*')
  .eq('project_id', projectId)
  .order('area_name', { ascending: true });
if (areaError) console.error('Error:', areaError);
else {
  console.log('Rows:', areaData?.length);
  if (areaData?.length > 0) console.log('First:', JSON.stringify(areaData[0], null, 2));
}
