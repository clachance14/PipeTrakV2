import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '', supabaseKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

// Check the function definition
const { data: funcDef, error: funcErr } = await supabase.rpc('sql', {
  query: "SELECT prosrc FROM pg_proc WHERE proname = 'get_progress_delta_by_dimension' LIMIT 1"
});

if (funcErr) {
  console.log('Cannot query function def, checking migration applied...');
} else {
  console.log('Function contains milestone_events_in_range:', funcDef?.[0]?.prosrc?.includes('milestone_events_in_range'));
  console.log('Function length:', funcDef?.[0]?.prosrc?.length, 'chars');
}

// Check schema_migrations
const { data: migs } = await supabase
  .from('supabase_migrations.schema_migrations')
  .select('version')
  .order('version', { ascending: false })
  .limit(5);
  
console.log('\nRecent migrations:', migs);
