import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim();
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function check() {
  // Check how PostgreSQL handles the JSONB value
  const { data, error } = await supabase.rpc('test_jsonb_comparison', {});

  if (error) {
    console.log('Need to create test function. Running raw SQL...');

    // Just check directly in JS
    const { data: comp } = await supabase
      .from('components')
      .select('current_milestones')
      .not('current_milestones', 'is', null)
      .neq('current_milestones', '{}')
      .limit(1);

    if (comp && comp[0]) {
      console.log('Sample current_milestones:', JSON.stringify(comp[0].current_milestones, null, 2));
      console.log('Type in JS:', typeof comp[0].current_milestones);

      const milestones = comp[0].current_milestones;
      for (const [key, value] of Object.entries(milestones)) {
        console.log('  ' + key + ': value=' + value + ', type=' + typeof value);
      }
    }
  }

  // Check specifically for spool with Receive=100
  const { data: spools } = await supabase
    .from('components')
    .select('id, current_milestones')
    .eq('component_type', 'spool')
    .not('current_milestones', 'is', null)
    .neq('current_milestones', '{}')
    .limit(3);

  console.log('\nSpools with milestones:');
  for (const s of spools || []) {
    const receive = s.current_milestones?.Receive;
    console.log('  Receive:', receive, '| type:', typeof receive);
    console.log('  Receive === 100:', receive === 100);
    console.log('  Receive == "100":', receive == '100');
    console.log('  String(Receive):', String(receive));
  }
}

check();
