import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '', supabaseKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const { data: projects, error } = await supabase
  .from('projects')
  .select('id, name, organization_id');

if (error) { console.error(error); process.exit(1); }

for (const p of projects) {
  // Get org name
  const { data: org } = await supabase.from('organizations').select('name').eq('id', p.organization_id).single();
  
  // Get user membership
  const { data: members } = await supabase.from('project_members').select('user_id, role').eq('project_id', p.id);
  
  console.log(p.name);
  console.log('  Org:', org?.name || 'none');
  console.log('  ID:', p.id);
  
  for (const m of members || []) {
    const { data: user } = await supabase.from('users').select('email').eq('id', m.user_id).single();
    console.log('  Member:', user?.email, '(' + m.role + ')');
  }
  console.log('');
}
