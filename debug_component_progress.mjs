import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseServiceKey = '';

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring(18).trim();
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring(26).trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const DARK_KNIGHT_PROJECT_ID = 'e34ca1d2-b740-4294-b17c-96fdbc187058';

async function checkSchema() {
  console.log('Checking components table schema...\n');

  const { data: components, error } = await supabase
    .from('components')
    .select('*')
    .eq('project_id', DARK_KNIGHT_PROJECT_ID)
    .limit(1);

  if (error) {
    console.error('Error:', error.message);
    return null;
  }

  if (components && components.length > 0) {
    console.log('Components table columns:', Object.keys(components[0]));
    return components[0];
  }

  return null;
}

async function checkDrawingsSchema() {
  console.log('\nChecking mv_drawing_progress view schema...\n');

  const { data: drawings, error } = await supabase
    .from('mv_drawing_progress')
    .select('*')
    .eq('project_id', DARK_KNIGHT_PROJECT_ID)
    .limit(1);

  if (error) {
    console.error('Error:', error.message);
    return null;
  }

  if (drawings && drawings.length > 0) {
    console.log('mv_drawing_progress columns:', Object.keys(drawings[0]));
    return drawings[0];
  }

  return null;
}

async function main() {
  const sampleComponent = await checkSchema();
  const sampleDrawing = await checkDrawingsSchema();

  if (!sampleComponent) {
    console.log('Could not fetch sample component');
    return;
  }

  console.log('\nSample component data:');
  console.log(JSON.stringify(sampleComponent, null, 2));

  if (sampleDrawing) {
    console.log('\nSample drawing progress data:');
    console.log(JSON.stringify(sampleDrawing, null, 2));
  }

  console.log('\n\nChecking specific spool components...\n');

  const { data: spools, error: spoolsError } = await supabase
    .from('components')
    .select('id, component_id, component_type, current_milestones, percent_complete, progress_template_id')
    .eq('project_id', DARK_KNIGHT_PROJECT_ID)
    .eq('component_type', 'spool')
    .limit(10);

  if (spoolsError) {
    console.error('Error querying spools:', spoolsError.message);
  } else {
    console.log(`Found ${spools.length} spool components:`);
    spools.forEach(spool => {
      console.log(`\n  Component ID: ${spool.component_id}`);
      console.log(`  Template ID: ${spool.progress_template_id}`);
      console.log(`  Milestones:`, spool.current_milestones);
      console.log(`  Percent: ${spool.percent_complete}%`);
    });
  }
}

main();
