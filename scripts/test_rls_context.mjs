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

// Test WITHOUT authentication (anon)
console.log('Testing WITHOUT auth (anon key only)...');
const { data: anonData, error: anonError } = await supabase
  .from('vw_manhour_progress_by_test_package')
  .select('*')
  .eq('project_id', 'e34ca1d2-b740-4294-b17c-96fdbc187058')
  .order('test_package_name', { ascending: true })
  .limit(3);

if (anonError) {
  console.error('Anon error:', JSON.stringify(anonError, null, 2));
} else {
  console.log('Anon success, rows:', anonData?.length);
}

// Check the areas view too (from earlier error)
console.log('\nTesting vw_manhour_progress_by_area...');
const { data: areaData, error: areaError } = await supabase
  .from('vw_manhour_progress_by_area')
  .select('*')
  .eq('project_id', 'e34ca1d2-b740-4294-b17c-96fdbc187058')
  .order('area_name', { ascending: true })
  .limit(3);

if (areaError) {
  console.error('Area error:', JSON.stringify(areaError, null, 2));
} else {
  console.log('Area success, rows:', areaData?.length);
}
