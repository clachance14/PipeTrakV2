// scripts/test_view_error.mjs
// Test the manhour view to see the actual error

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseServiceKey = '';

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim();
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function test() {
  console.log('Testing vw_manhour_progress_by_area...\n');

  const { data, error } = await supabase
    .from('vw_manhour_progress_by_area')
    .select('*')
    .eq('project_id', 'e34ca1d2-b740-4294-b17c-96fdbc187058')
    .order('area_name', { ascending: true });

  if (error) {
    console.log('ERROR:', error.message);
    console.log('Details:', JSON.stringify(error, null, 2));
  } else {
    console.log('Success! Data:');
    console.log(JSON.stringify(data, null, 2));
  }
}

test().catch(console.error);
