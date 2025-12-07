// scripts/test_view_anon_key.mjs
// Test the manhour view with anon key (like frontend)

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

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function test() {
  console.log('Testing vw_manhour_progress_by_area with anon key...\n');

  const { data, error } = await supabase
    .from('vw_manhour_progress_by_area')
    .select('*')
    .eq('project_id', 'e34ca1d2-b740-4294-b17c-96fdbc187058')
    .order('area_name', { ascending: true });

  if (error) {
    console.log('ERROR:', error.message);
    console.log('Code:', error.code);
    console.log('Details:', error.details);
    console.log('Hint:', error.hint);
  } else {
    console.log('Success! Data:');
    console.log(JSON.stringify(data, null, 2));
  }
}

test().catch(console.error);
