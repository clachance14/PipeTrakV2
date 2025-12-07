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

// Test the view without auth
const { data, error } = await supabase
  .from('vw_manhour_progress_by_area')
  .select('*')
  .eq('project_id', '00771244-552e-4b07-bf44-819b1a9ca7a4')
  .order('area_name', { ascending: true })
  .limit(5);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Data rows:', data?.length);
}
