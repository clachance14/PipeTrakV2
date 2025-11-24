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

async function main() {
  console.log('Checking spool components...\n');

  const { data: spools, error } = await supabase
    .from('components')
    .select('id, component_type, identity_key, current_milestones, percent_complete')
    .eq('project_id', DARK_KNIGHT_PROJECT_ID)
    .eq('component_type', 'spool')
    .limit(20);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${spools.length} spool components\n`);

  spools.forEach((spool, index) => {
    const hasMilestones = Object.keys(spool.current_milestones || {}).length > 0;
    console.log(`${index + 1}. Identity: ${JSON.stringify(spool.identity_key)}`);
    console.log(`   Milestones: ${hasMilestones ? JSON.stringify(spool.current_milestones) : 'EMPTY'}`);
    console.log(`   Percent: ${spool.percent_complete}%\n`);
  });

  // Count how many have empty milestones
  const emptyCount = spools.filter(s => Object.keys(s.current_milestones || {}).length === 0).length;
  console.log(`\nSummary: ${emptyCount}/${spools.length} spools have EMPTY milestones`);
}

main();
