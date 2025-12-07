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

  // Method 1: Direct count from field_welds.date_welded
  const { data: welded, error: e1 } = await supabase
    .from('field_welds')
    .select('id')
    .eq('project_id', projectId)
    .not('date_welded', 'is', null);

  console.log('Method 1 - field_welds with date_welded set:', welded ? welded.length : 0);

  // Method 2: Count from components.current_milestones
  const { data: components, error: e2 } = await supabase
    .from('components')
    .select('id, current_milestones')
    .eq('project_id', projectId)
    .eq('component_type', 'field_weld')
    .eq('is_retired', false);

  if (components) {
    let fitupComplete = 0;
    let weldComplete = 0;

    components.forEach(c => {
      const m = c.current_milestones || {};
      if (m['Fit-up'] === 1 || m['Fit-Up'] === 1) fitupComplete++;
      if (m['Weld Complete'] === 1 || m['Weld Made'] === 1) weldComplete++;
    });

    console.log('Method 2 - components with Fit-up=1:', fitupComplete);
    console.log('Method 2 - components with Weld Complete=1:', weldComplete);
  }

  // Method 3: Query the view directly
  const { data: viewData, error: e3 } = await supabase
    .from('vw_field_weld_progress_by_area')
    .select('*')
    .eq('project_id', projectId);

  if (e3) {
    console.log('\nView query error:', e3.message);
  } else if (viewData) {
    console.log('\nMethod 3 - vw_field_weld_progress_by_area:');
    let totalFitup = 0;
    let totalWeld = 0;
    let totalWelds = 0;
    viewData.forEach(row => {
      console.log('  ' + row.area_name + ': fitup_count=' + row.fitup_count + ', weld_complete_count=' + row.weld_complete_count + ', total=' + row.total_welds);
      totalFitup += row.fitup_count || 0;
      totalWeld += row.weld_complete_count || 0;
      totalWelds += row.total_welds || 0;
    });
    console.log('  TOTAL: fitup_count=' + totalFitup + ', weld_complete_count=' + totalWeld + ', total=' + totalWelds);
  }

  // Also check if there are any retired components
  const { data: retired, error: e4 } = await supabase
    .from('components')
    .select('id')
    .eq('project_id', projectId)
    .eq('component_type', 'field_weld')
    .eq('is_retired', true);

  console.log('\nRetired field_weld components:', retired ? retired.length : 0);
}

check();
