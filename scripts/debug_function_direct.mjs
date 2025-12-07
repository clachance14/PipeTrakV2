import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim();
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function check() {
  // Test the function directly with known values
  const testCases = [
    { type: 'spool', milestones: '{"Receive": 100}', category: 'received' },
    { type: 'spool', milestones: '{"Receive": "100"}', category: 'received' },
    { type: 'spool', milestones: '{"Receive": 1}', category: 'received' },
    { type: 'spool', milestones: '{"Receive": true}', category: 'received' },
    { type: 'field_weld', milestones: '{"Fit-up": 100}', category: 'received' },
    { type: 'field_weld', milestones: '{"Weld Complete": 100}', category: 'installed' },
  ];

  console.log('Testing calculate_earned_milestone_value directly:\n');

  for (const tc of testCases) {
    const { data, error } = await supabase.rpc('calculate_earned_milestone_value', {
      p_component_type: tc.type,
      p_milestones: tc.milestones,
      p_category: tc.category
    });

    console.log(tc.type + ' / ' + tc.category + ' / ' + tc.milestones);
    console.log('  Result:', data, '| Error:', error?.message || 'none');
  }
}

check();
