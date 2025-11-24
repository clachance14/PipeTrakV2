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

const targetSpools = [
  'V-26C03-SPOOL2',
  'V-26B02-1-SPOOL3',
  'V-26B02-1-SPOOL2',
  'V-26B02-1-SPOOL1',
  'V-26B01-1-SPOOL3',
  'V-26B01-1-SPOOL2',
  'V-26B01-1-SPOOL1',
  'V-26B01-1-SPOOL4',
  'P-94011-5-SPOOL5',
  'P-94011-5-SPOOL4'
];

async function main() {
  console.log('Searching for specific spools mentioned in recent activity...\n');

  for (const spoolId of targetSpools) {
    const { data: spools, error } = await supabase
      .from('components')
      .select('id, component_type, identity_key, current_milestones, percent_complete, last_updated_at')
      .eq('project_id', DARK_KNIGHT_PROJECT_ID)
      .eq('component_type', 'spool')
      .contains('identity_key', { spool_id: spoolId });

    if (error) {
      console.error(`Error searching for ${spoolId}:`, error.message);
      continue;
    }

    if (!spools || spools.length === 0) {
      console.log(`❌ ${spoolId}: NOT FOUND`);
      continue;
    }

    const spool = spools[0];
    const hasErect = spool.current_milestones?.Erect === 100;

    console.log(`\n📦 ${spoolId}`);
    console.log(`   Milestones: ${JSON.stringify(spool.current_milestones)}`);
    console.log(`   Percent: ${spool.percent_complete}%`);
    console.log(`   Erect Complete: ${hasErect ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Last Updated: ${spool.last_updated_at}`);
  }
}

main();
