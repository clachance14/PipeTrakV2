/**
 * Script: Recalculate progress percentages for Dark Knight project
 * Purpose: After fixing calculate_component_percent function (migration 20251124165954),
 *          we need to recalculate all existing components that had incorrect 0% progress
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read environment variables
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

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const DARK_KNIGHT_PROJECT_ID = 'e34ca1d2-b740-4294-b17c-96fdbc187058';

async function main() {
  console.log('🔧 Recalculating progress for Dark Knight project...\n');

  // Get all distinct component types in the project
  const { data: components, error: componentsError } = await supabase
    .from('components')
    .select('component_type')
    .eq('project_id', DARK_KNIGHT_PROJECT_ID);

  if (componentsError) {
    console.error('❌ Error fetching components:', componentsError.message);
    process.exit(1);
  }

  const componentTypes = [...new Set(components.map(c => c.component_type))];
  console.log(`Found ${componentTypes.length} component type(s):`, componentTypes);
  console.log('');

  let totalRecalculated = 0;

  // Recalculate each component type
  for (const componentType of componentTypes) {
    console.log(`📊 Recalculating ${componentType}...`);

    const { data, error } = await supabase.rpc('recalculate_components_with_template', {
      target_project_id: DARK_KNIGHT_PROJECT_ID,
      target_component_type: componentType
    });

    if (error) {
      console.error(`  ❌ Error recalculating ${componentType}:`, error.message);
    } else {
      console.log(`  ✅ Recalculated ${data} component(s)`);
      totalRecalculated += data;
    }
  }

  console.log('');
  console.log(`🎉 Done! Recalculated ${totalRecalculated} total component(s)`);
  console.log('');
  console.log('Next step: Refresh the drawings page in your browser to see updated progress.');
}

main();
