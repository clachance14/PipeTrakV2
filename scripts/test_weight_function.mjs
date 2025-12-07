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

// Test the weight function directly
const { data, error } = await supabase.rpc('get_milestone_weight', {
  p_project_id: '00771244-552e-4b07-bf44-819b1a9ca7a4',
  p_component_type: 'spool',
  p_standard_milestone: 'receive'
});

if (error) {
  console.error('Error testing get_milestone_weight:', error);
} else {
  console.log('Spool receive weight:', data);
}

// Test field weld
const { data: data2, error: error2 } = await supabase.rpc('get_milestone_weight', {
  p_project_id: '00771244-552e-4b07-bf44-819b1a9ca7a4',
  p_component_type: 'field_weld',
  p_standard_milestone: 'install'
});

if (error2) {
  console.error('Error testing field_weld install:', error2);
} else {
  console.log('Field weld install weight:', data2);
}
