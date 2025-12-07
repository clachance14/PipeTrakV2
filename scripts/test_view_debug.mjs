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

// Test the exact failing query
console.log('Testing vw_manhour_progress_by_test_package for project e34ca1d2-b740-4294-b17c-96fdbc187058...');

const { data, error } = await supabase
  .from('vw_manhour_progress_by_test_package')
  .select('*')
  .eq('project_id', 'e34ca1d2-b740-4294-b17c-96fdbc187058')
  .order('test_package_name', { ascending: true });

if (error) {
  console.error('Error:', JSON.stringify(error, null, 2));
} else {
  console.log('Success! Rows:', data?.length);
  if (data?.length > 0) {
    console.log('First row:', JSON.stringify(data[0], null, 2));
  }
}

// Also test what component types exist in this project
console.log('\n--- Component types in this project ---');
const { data: components, error: compError } = await supabase
  .from('components')
  .select('component_type, current_milestones')
  .eq('project_id', 'e34ca1d2-b740-4294-b17c-96fdbc187058')
  .limit(20);

if (compError) {
  console.error('Component query error:', compError);
} else {
  const types = [...new Set(components.map(c => c.component_type))];
  console.log('Component types:', types);
  
  // Check for any weird milestone data
  for (const comp of components) {
    if (comp.current_milestones) {
      try {
        // Check if milestones is valid
        const keys = Object.keys(comp.current_milestones);
      } catch (e) {
        console.log('Bad milestones found:', comp);
      }
    }
  }
}
