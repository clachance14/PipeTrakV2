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
  // Get all templates with is_partial info
  const { data: templates } = await supabase
    .from('progress_templates')
    .select('id, component_type, milestones_config')
    .eq('version', 1);

  const templateById = {};
  templates.forEach(t => {
    templateById[t.id] = {
      type: t.component_type,
      milestones: {}
    };
    t.milestones_config.forEach(m => {
      templateById[t.id].milestones[m.name] = {
        weight: m.weight,
        is_partial: m.is_partial || false
      };
    });
  });

  // Get ALL components with milestones
  const { data: components } = await supabase
    .from('components')
    .select('id, component_type, percent_complete, current_milestones, progress_template_id, identity_key, projects(name)')
    .not('current_milestones', 'is', null);

  const wouldBreak = [];
  let convertedCount = 0;
  let skippedNoMatchCount = 0;
  let skippedPartialCount = 0;

  components.forEach(c => {
    const m = c.current_milestones || {};
    if (Object.keys(m).length === 0) return;

    const template = templateById[c.progress_template_id];
    if (!template) return;

    // SAFE conversion - only convert if milestone exists in template AND is discrete
    const converted = {};
    let anyConverted = false;

    Object.entries(m).forEach(([key, val]) => {
      const milestoneConfig = template.milestones[key];

      if (!milestoneConfig) {
        // Milestone name doesn't match template - DON'T convert
        converted[key] = val;
        if (val === 1 || val === true) skippedNoMatchCount++;
        return;
      }

      const isPartial = milestoneConfig.is_partial;

      if (val === true && !isPartial) {
        converted[key] = 100;
        anyConverted = true;
        convertedCount++;
      } else if (val === false) {
        converted[key] = 0;
        anyConverted = true;
      } else if (val === 1 && !isPartial) {
        converted[key] = 100;
        anyConverted = true;
        convertedCount++;
      } else if (val === 1 && isPartial) {
        converted[key] = val;
        skippedPartialCount++;
      } else {
        converted[key] = val;
      }
    });

    if (!anyConverted) return;

    // Calculate new percent
    let newPct = 0;
    Object.entries(converted).forEach(([key, val]) => {
      const milestoneConfig = template.milestones[key];
      if (!milestoneConfig) return;

      if (milestoneConfig.is_partial) {
        newPct += (milestoneConfig.weight * val / 100);
      } else {
        if (val === 100) {
          newPct += milestoneConfig.weight;
        }
      }
    });

    const currentPct = c.percent_complete || 0;

    if (newPct < currentPct - 1) {
      wouldBreak.push({
        type: c.component_type,
        project: c.projects?.name,
        id: c.id,
        currentPct,
        newPct: Math.round(newPct * 100) / 100,
        milestones: m,
        converted
      });
    }
  });

  console.log('=== SAFE CONVERSION SIMULATION ===');
  console.log('Discrete values converted (1/true -> 100):', convertedCount);
  console.log('Skipped - no template match:', skippedNoMatchCount);
  console.log('Skipped - partial milestone:', skippedPartialCount);

  console.log('\n=== WOULD BREAK (show lower %) ===');
  if (wouldBreak.length === 0) {
    console.log('*** SAFE: No components would show lower progress! ***');
  } else {
    console.log(wouldBreak.length + ' components would show LOWER progress:');
    wouldBreak.forEach(b => {
      console.log('\n  ' + b.type + ' in ' + b.project);
      console.log('    Current: ' + b.currentPct + '% -> New: ' + b.newPct + '%');
      console.log('    Original milestones:', JSON.stringify(b.milestones));
      console.log('    After conversion:', JSON.stringify(b.converted));
    });
  }
}

simulate();
