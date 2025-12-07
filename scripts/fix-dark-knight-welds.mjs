// Fix script to set percent_complete = 100 for welds with NDE PASS but 0% progress
// in the 1605 Dark Knight project
//
// Usage:
//   node scripts/fix-dark-knight-welds.mjs          # Dry-run (shows what would change)
//   node scripts/fix-dark-knight-welds.mjs --apply  # Actually apply the changes

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const DRY_RUN = !process.argv.includes('--apply');

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

console.log('=== Dark Knight Weld Progress Fix ===\n');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'APPLY (changes will be made)'}\n`);

// 1. Find the 1605 Dark Knight project
const { data: projects, error: projectError } = await supabase
  .from('projects')
  .select('id, name')
  .ilike('name', '%1605%dark knight%');

if (projectError) {
  console.error('Error finding project:', projectError);
  process.exit(1);
}

if (!projects?.length) {
  console.log('No matching project found');
  process.exit(1);
}

const projectId = projects[0].id;
console.log(`Project: ${projects[0].name}`);
console.log(`Project ID: ${projectId}\n`);

// 2. Find all welds with NDE PASS but progress < 100
const { data: affectedWelds, error } = await supabase
  .from('field_welds')
  .select(`
    id,
    nde_result,
    nde_type,
    status,
    component:components!component_id (
      id,
      identity_key,
      percent_complete,
      current_milestones
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

// 3. Show what will be changed
console.log('=== Records to be updated ===\n');
needsFix.forEach((w, i) => {
  const weldIdNum = w.component.identity_key?.weld_id_number ?? 'N/A';
  console.log(`${i + 1}. Weld ${weldIdNum}`);
  console.log(`   Component ID: ${w.component.id}`);
  console.log(`   Current progress: ${w.component.percent_complete}% → 100%`);
});
console.log('');

// 4. Apply the fix (if not dry run)
if (DRY_RUN) {
  console.log('=== DRY RUN COMPLETE ===');
  console.log('To apply changes, run: node scripts/fix-dark-knight-welds.mjs --apply');
  process.exit(0);
}

// Actually apply the changes
console.log('=== Applying changes ===\n');

let successCount = 0;
let errorCount = 0;

for (const weld of needsFix) {
  const componentId = weld.component.id;
  const weldIdNum = weld.component.identity_key?.weld_id_number ?? 'N/A';

  const { error: updateError } = await supabase
    .from('components')
    .update({
      percent_complete: 100
    })
    .eq('id', componentId);

  if (updateError) {
    console.log(`❌ Failed to update Weld ${weldIdNum}: ${updateError.message}`);
    errorCount++;
  } else {
    console.log(`✅ Updated Weld ${weldIdNum} to 100%`);
    successCount++;
  }
}

console.log('\n=== Summary ===');
console.log(`Successful updates: ${successCount}`);
console.log(`Failed updates: ${errorCount}`);

if (errorCount > 0) {
  console.log('\n⚠️  Some updates failed. Review errors above.');
  process.exit(1);
}

console.log('\n✅ All updates completed successfully!');
