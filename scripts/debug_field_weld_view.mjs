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
  console.log('Project:', projects[0].name, '\n');

  // Check area assignments for field welds with date_welded
  const { data: weldsWithArea, error: e1 } = await supabase
    .from('field_welds')
    .select('id, date_welded, component_id, components!inner(id, area_id, current_milestones, identity_key, areas(name))')
    .eq('project_id', projectId)
    .not('date_welded', 'is', null);

  if (e1) {
    console.log('Error:', e1.message);
    return;
  }

  console.log('Field welds with date_welded set:', weldsWithArea.length);

  let withArea = 0;
  let withoutArea = 0;
  let withAreaAndMilestone = 0;
  let withoutAreaButMilestone = 0;

  weldsWithArea.forEach(fw => {
    const m = fw.components.current_milestones || {};
    const hasWeldComplete = m['Weld Complete'] === 1;
    const areaName = fw.components.areas?.name;

    if (fw.components.area_id) {
      withArea++;
      if (hasWeldComplete) withAreaAndMilestone++;
    } else {
      withoutArea++;
      if (hasWeldComplete) withoutAreaButMilestone++;
    }
  });

  console.log('\n--- Breakdown of welded field_welds ---');
  console.log('With area_id:', withArea, '(with Weld Complete=1:', withAreaAndMilestone + ')');
  console.log('Without area_id (unassigned):', withoutArea, '(with Weld Complete=1:', withoutAreaButMilestone + ')');

  // Now let's look at specific components where Weld Complete != 1 but date_welded is set
  console.log('\n--- Discrepancy: date_welded set but Weld Complete != 1 ---');
  let mismatchCount = 0;
  weldsWithArea.forEach(fw => {
    const m = fw.components.current_milestones || {};
    const wc = m['Weld Complete'];
    if (wc !== 1) {
      mismatchCount++;
      const ik = fw.components.identity_key || {};
      console.log('  Weld:', ik.weld_number || fw.component_id);
      console.log('    date_welded:', fw.date_welded);
      console.log('    Weld Complete:', wc);
      console.log('    milestones:', JSON.stringify(m));
    }
  });
  console.log('Total mismatches:', mismatchCount);

  // Also check: are there welds in area "Rail Car Loading" without Weld Complete?
  const areaId = weldsWithArea.find(fw => fw.components.areas?.name === 'Rail Car Loading')?.components.area_id;
  if (areaId) {
    console.log('\n--- All welded field_welds in Rail Car Loading area ---');
    const inArea = weldsWithArea.filter(fw => fw.components.area_id === areaId);
    console.log('Count:', inArea.length);
    inArea.forEach(fw => {
      const m = fw.components.current_milestones || {};
      const ik = fw.components.identity_key || {};
      console.log('  ' + (ik.weld_number || fw.component_id) + ': Weld Complete=' + m['Weld Complete'] + ', Fit-up=' + m['Fit-up']);
    });
  }
}

check();
