import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '', supabaseKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const { data: orgs } = await supabase.from('organizations').select('id, name');
console.log('All organizations:');
orgs.forEach(o => console.log('  ' + o.name + ' (' + o.id + ')'));

// Check for ICS
const ics = orgs.find(o => o.name.toLowerCase().includes('ics'));
if (ics) {
  console.log('\nICS org found:', ics.name);
  const { data: icsProjects } = await supabase.from('projects').select('id, name').eq('organization_id', ics.id);
  console.log('ICS projects:');
  icsProjects?.forEach(p => console.log('  ' + p.name + ' (' + p.id + ')'));
}
