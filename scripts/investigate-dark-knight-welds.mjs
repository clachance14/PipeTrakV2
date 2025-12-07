// Read-only script to find welds with QC PASS but < 100% progress
// in the Dark Knight project
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Check .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

console.log('=== Dark Knight Weld Progress Investigation ===\n');

// 1. Find the 1605 Dark Knight project specifically
const { data: projects, error: projectError } = await supabase
  .from('projects')
  .select('id, name')
  .ilike('name', '%1605%dark knight%');

if (projectError) {
  console.error('Error finding project:', projectError);
  process.exit(1);
}

console.log('Projects matching "1605 Dark Knight":', projects);

if (!projects?.length) {
  console.log('No matching project found');
  process.exit(1);
}

const projectId = projects[0].id;
console.log(`\nUsing project: ${projects[0].name} (${projectId})\n`);

// 2. Find all welds with NDE PASS but progress < 100
const { data: affectedWelds, error } = await supabase
  .from('field_welds')
  .select(`
    id,
    weld_type,
    weld_size,
    nde_result,
    nde_type,
    nde_date,
    status,
    component:components!component_id (
      id,
      identity_key,
      percent_complete,
      current_milestones,
      progress_template_id,
      progress_template:progress_templates!progress_template_id (
        id,
        component_type,
        milestones_config
      )
    )
  `)
  .eq('project_id', projectId)
  .eq('nde_result', 'PASS');

if (error) {
  console.error('Error querying welds:', error);
  process.exit(1);
}

// Filter for those with percent_complete < 100
const needsFix = affectedWelds.filter(w =>
  w.component && w.component.percent_complete < 100
);

console.log(`Total welds with NDE PASS: ${affectedWelds.length}`);
console.log(`Welds needing fix (progress < 100%): ${needsFix.length}\n`);

if (needsFix.length === 0) {
  console.log('No welds need fixing. All NDE PASS welds have 100% progress.');
  process.exit(0);
}

// Show sample of affected records
console.log('=== Sample of affected welds (first 15) ===\n');
needsFix.slice(0, 15).forEach(w => {
  const weldIdNum = w.component.identity_key?.weld_id_number ?? 'N/A';
  console.log(`Weld ID: ${weldIdNum} (DB: ${w.id})`);
  console.log(`  NDE: ${w.nde_type} - ${w.nde_result}`);
  console.log(`  Status: ${w.status}`);
  console.log(`  Current Progress: ${w.component.percent_complete}%`);
  console.log(`  Milestones: ${JSON.stringify(w.component.current_milestones)}`);
  console.log(`  Template: ${w.component.progress_template?.component_type ?? 'N/A'}`);
  console.log('');
});

// Show unique templates being used
const templates = [...new Set(needsFix.map(w => JSON.stringify(w.component.progress_template?.milestones_config)))];
console.log('=== Progress Templates Used ===\n');
templates.forEach(t => console.log(t));
console.log('');

// Show all component IDs that need fixing
console.log('=== All component IDs needing fix ===\n');
const componentIds = needsFix.map(w => w.component.id);
console.log(JSON.stringify(componentIds, null, 2));

// Summary
console.log('\n=== Summary ===');
console.log(`Project: ${projects[0].name}`);
console.log(`Project ID: ${projectId}`);
console.log(`Records to fix: ${needsFix.length}`);
console.log('Fix action: Set percent_complete = 100, milestones = {"Fit-up": 100, "Weld Complete": 100, "Accepted": 100}');
