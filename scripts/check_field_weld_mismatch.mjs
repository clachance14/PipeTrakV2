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
  // Get project ID first
  const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', '%Rail Car Loading%');
  if (!projects || projects.length === 0) {
    console.log('No project found');
    return;
  }
  const projectId = projects[0].id;
  console.log('Project:', projects[0].name);

  // Get field_welds with their component milestones
  const { data, error } = await supabase
    .from('field_welds')
    .select('id, date_welded, status, component_id, components!inner(id, current_milestones, identity_key)')
    .eq('project_id', projectId);

  if (error) {
    console.log('Error:', error);
    return;
  }

  console.log('Total field_welds found:', data.length);

  let dateWeldedSet = 0;
  let dateWeldedNull = 0;
  let milestoneMismatch = [];

  data.forEach(fw => {
    const milestones = fw.components.current_milestones || {};
    const fitup = milestones['Fit-up'] || milestones['Fit-Up'] || 0;
    const weldComplete = milestones['Weld Complete'] || milestones['Weld Made'] || 0;

    if (fw.date_welded) {
      dateWeldedSet++;
      // Should have Fit-up and Weld Complete set
      if (fitup === 0 || weldComplete === 0) {
        const ik = fw.components.identity_key || {};
        milestoneMismatch.push({
          id: fw.component_id,
          name: ik.weld_number || ik.tag || fw.component_id,
          date_welded: fw.date_welded,
          milestones: milestones
        });
      }
    } else {
      dateWeldedNull++;
    }
  });

  console.log('date_welded IS SET:', dateWeldedSet);
  console.log('date_welded IS NULL:', dateWeldedNull);
  console.log('Mismatched (date_welded set but milestones=0):', milestoneMismatch.length);

  if (milestoneMismatch.length > 0) {
    console.log('\nSample mismatches (first 10):');
    milestoneMismatch.slice(0, 10).forEach(m => {
      console.log('  ' + m.name + ' | date_welded: ' + m.date_welded + ' | milestones: ' + JSON.stringify(m.milestones));
    });
  }
}

check();
