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

  console.log('\nTemplate milestones:');
  const weights = {};
  template.milestones_config.forEach(m => {
    console.log('  ' + m.name + ': weight=' + m.weight + ', is_partial=' + m.is_partial);
    weights[m.name] = m.weight;
  });

  // Get sample field_welds that would be affected
  const { data: welds } = await supabase
    .from('components')
    .select('id, percent_complete, current_milestones, identity_key')
    .eq('project_id', projectId)
    .eq('component_type', 'field_weld')
    .limit(20);

  console.log('\n=== SIMULATION: What will happen to each weld ===');
  console.log('(Simulating conversion of 1 -> 100 and recalculating percent_complete)\n');

  let wouldBreak = 0;
  let wouldFix = 0;
  let noChange = 0;

  welds.forEach(w => {
    const ik = w.identity_key || {};
    const name = ik.weld_number || w.id.slice(0, 8);
    const m = w.current_milestones || {};

    // Simulate conversion: 1 -> 100, true -> 100, false -> 0
    const converted = {};
    Object.entries(m).forEach(([key, val]) => {
      if (val === 1) converted[key] = 100;
      else if (val === true) converted[key] = 100;
      else if (val === false) converted[key] = 0;
      else converted[key] = val;
    });

    // Calculate new percent using template weights
    let newPct = 0;
    Object.entries(converted).forEach(([key, val]) => {
      const weight = weights[key] || 0;
      if (val === 100 && weight > 0) {
        newPct += weight;
      }
    });

    const currentPct = w.percent_complete;
    const diff = newPct - currentPct;

    if (Math.abs(diff) < 0.01) {
      noChange++;
    } else if (newPct < currentPct) {
      wouldBreak++;
      console.log('WOULD BREAK: Weld ' + name);
      console.log('  Current: ' + currentPct + '% -> New: ' + newPct + '%');
      console.log('  Milestones:', JSON.stringify(m));
      console.log('  Converted:', JSON.stringify(converted));
      console.log('  Weight lookup:', Object.entries(converted).map(([k,v]) => k + '=' + v + ' (weight:' + (weights[k]||0) + ')').join(', '));
    } else {
      wouldFix++;
      console.log('Would fix: Weld ' + name + ' - ' + currentPct + '% -> ' + newPct + '%');
    }
  });

  console.log('\n=== SUMMARY ===');
  console.log('Would break (lower %):', wouldBreak);
  console.log('Would fix (higher %):', wouldFix);
  console.log('No change:', noChange);

  if (wouldBreak > 0) {
    console.log('\n*** WARNING: Some welds would show LOWER progress after migration! ***');
  } else {
    console.log('\n*** SAFE: No welds would show lower progress ***');
  }
}

simulate();
