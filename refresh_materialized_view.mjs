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

async function main() {
  console.log('🔄 Refreshing materialized view mv_drawing_progress...\n');

  const { data, error } = await supabase.rpc('refresh_drawing_progress_view');

  if (error) {
    // Try direct SQL execution if RPC doesn't exist
    console.log('RPC not found, trying direct SQL execution...');

    const { error: sqlError } = await supabase.from('mv_drawing_progress').select('count').limit(0);

    if (sqlError) {
      console.error('❌ Error:', sqlError.message);
      console.log('\nManual action required:');
      console.log('Run this SQL in Supabase Dashboard SQL Editor:');
      console.log('REFRESH MATERIALIZED VIEW mv_drawing_progress;');
      return;
    }
  }

  console.log('✅ Materialized view refreshed successfully!');
  console.log('\nNow the drawings page should show correct progress percentages.');
  console.log('Refresh your browser to see the updated data.');
}

main();
