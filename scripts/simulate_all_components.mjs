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
  // Get all templates
  const { data: templates } = await supabase
    .from('progress_templates')
    .select('component_type, milestones_config')
    .eq('version', 1);

  const weightsByType = {};
  templates.forEach(t => {
    weightsByType[t.component_type] = {};
    t.milestones_config.forEach(m => {
      weightsByType[t.component_type][m.name] = m.weight;
    });
  });

  console.log('Component types with templates:', Object.keys(weightsByType).join(', '));

  // Get ALL components with milestones that have value=1 or boolean values
  const { data: components } = await supabase
    .from('components')
    .select('id, component_type, percent_complete, current_milestones, identity_key, project_id, projects(name)')
    .not('current_milestones', 'is', null);

  // Group by component_type and check for values needing conversion
  const byType = {};
  const wouldBreak = [];

  components.forEach(c => {
    const m = c.current_milestones || {};
    if (Object.keys(m).length === 0) return;

    // Check if any values need conversion (1 or boolean)
    let needsConversion = false;
    Object.values(m).forEach(v => {
      if (v === 1 || v === true || v === false) needsConversion = true;
    });

    if (!needsConversion) return;

    if (!byType[c.component_type]) {
      byType[c.component_type] = { count: 0, samples: [] };
    }
    byType[c.component_type].count++;

    // Simulate conversion and recalculation
    const weights = weightsByType[c.component_type] || {};
    const converted = {};
    Object.entries(m).forEach(([key, val]) => {
      if (val === 1) converted[key] = 100;
      else if (val === true) converted[key] = 100;
      else if (val === false) converted[key] = 0;
      else converted[key] = val;
    });

    let newPct = 0;
    Object.entries(converted).forEach(([key, val]) => {
      const weight = weights[key];
      if (weight && val === 100) {
        newPct += weight;
      }
    });

    const currentPct = c.percent_complete || 0;

    if (newPct < currentPct) {
      wouldBreak.push({
        type: c.component_type,
        project: c.projects?.name,
        id: c.id,
        currentPct,
        newPct,
        milestones: m,
        converted,
        weights
      });
    }

    if (byType[c.component_type].samples.length < 2) {
      byType[c.component_type].samples.push({
        project: c.projects?.name,
        currentPct,
        newPct,
        milestones: m
      });
    }
  });

  console.log('\n=== COMPONENTS NEEDING CONVERSION (by type) ===');
  Object.entries(byType).forEach(([type, data]) => {
    console.log('\n' + type + ': ' + data.count + ' components');
    data.samples.forEach(s => {
      console.log('  Sample from ' + s.project + ':');
      console.log('    Current %: ' + s.currentPct + ', New %: ' + s.newPct);
      console.log('    Milestones:', JSON.stringify(s.milestones));
    });
  });

  console.log('\n=== WOULD BREAK (show lower %) ===');
  if (wouldBreak.length === 0) {
    console.log('None! All components are safe.');
  } else {
    console.log(wouldBreak.length + ' components would show LOWER progress:');
    wouldBreak.forEach(b => {
      console.log('\n  ' + b.type + ' in ' + b.project);
      console.log('    Current: ' + b.currentPct + '% -> New: ' + b.newPct + '%');
      console.log('    Milestones:', JSON.stringify(b.milestones));
      console.log('    Weights:', JSON.stringify(b.weights));
    });
  }
}

simulate();
