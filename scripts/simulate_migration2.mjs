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

async function simulate() {
  const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', '%Rail Car Loading%');
  const projectId = projects[0].id;
  console.log('Project:', projects[0].name);

  // Get field_weld template
  const { data: template } = await supabase
    .from('progress_templates')
    .select('id, milestones_config')
    .eq('component_type', 'field_weld')
    .eq('version', 1)
    .single();

  const weights = {};
  template.milestones_config.forEach(m => {
    weights[m.name] = m.weight;
  });
  console.log('Template weights:', weights);

  // Get ONLY field_welds with percent_complete = 100
  const { data: welds } = await supabase
    .from('components')
    .select('id, percent_complete, current_milestones, identity_key')
    .eq('project_id', projectId)
    .eq('component_type', 'field_weld')
    .eq('percent_complete', 100);

  console.log('\nField welds with percent_complete=100:', welds.length);

  welds.forEach(w => {
    const ik = w.identity_key || {};
    const name = ik.weld_number || w.id.slice(0, 8);
    const m = w.current_milestones || {};

    // Show current milestones
    console.log('\nWeld ' + name + ':');
    console.log('  Current milestones:', JSON.stringify(m));

    // Simulate conversion: 1 -> 100
    const converted = {};
    Object.entries(m).forEach(([key, val]) => {
      if (val === 1) converted[key] = 100;
      else if (val === true) converted[key] = 100;
      else if (val === false) converted[key] = 0;
      else converted[key] = val;
    });
    console.log('  After conversion:', JSON.stringify(converted));

    // Calculate new percent using template weights
    let newPct = 0;
    Object.entries(converted).forEach(([key, val]) => {
      const weight = weights[key];
      if (weight && val === 100) {
        console.log('    ' + key + ': val=' + val + ', weight=' + weight + ' -> adds ' + weight + '%');
        newPct += weight;
      } else if (val === 100) {
        console.log('    ' + key + ': val=' + val + ', NO WEIGHT FOUND');
      }
    });

    console.log('  Calculated new percent:', newPct + '%');
    console.log('  Current stored percent:', w.percent_complete + '%');

    if (newPct !== w.percent_complete) {
      console.log('  *** MISMATCH ***');
    }
  });
}

simulate();
