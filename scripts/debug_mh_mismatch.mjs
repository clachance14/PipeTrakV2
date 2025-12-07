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

async function investigate() {
  const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', '%Rail Car Loading%');
  const projectId = projects[0].id;
  console.log('Project:', projects[0].name);

  // Get field_weld components and compare percent_complete vs current_milestones
  const { data: fieldWelds } = await supabase
    .from('components')
    .select('id, percent_complete, current_milestones, budgeted_manhours, identity_key')
    .eq('project_id', projectId)
    .eq('component_type', 'field_weld')
    .eq('is_retired', false);

  console.log('\n=== FIELD WELD ANALYSIS ===');
  console.log('Total field_weld components:', fieldWelds.length);

  // Get progress template weights for field_weld
  const { data: templates } = await supabase
    .from('progress_templates')
    .select('milestones_config')
    .eq('component_type', 'field_weld')
    .eq('version', 1)
    .single();

  const milestoneWeights = {};
  if (templates && templates.milestones_config) {
    templates.milestones_config.forEach(m => {
      milestoneWeights[m.name] = m.weight;
    });
  }
  console.log('Milestone weights:', milestoneWeights);

  let totalMH = 0;
  let earnedFromPctComplete = 0;
  let earnedFromMilestones = 0;
  let discrepancies = [];

  fieldWelds.forEach(c => {
    const mh = c.budgeted_manhours || 0;
    totalMH += mh;

    // Method 1: From percent_complete
    const fromPct = (c.percent_complete / 100) * mh;
    earnedFromPctComplete += fromPct;

    // Method 2: Calculate from current_milestones using weights
    const milestones = c.current_milestones || {};
    let calculatedPct = 0;
    Object.entries(milestones).forEach(([name, value]) => {
      const weight = milestoneWeights[name] || 0;
      const numValue = typeof value === 'boolean' ? (value ? 100 : 0) : (value || 0);
      // For discrete milestones (0/1 or 0/100), value=1 or value=100 means 100% of that milestone
      const contribution = numValue >= 1 ? weight : 0;
      calculatedPct += contribution;
    });
    const fromMilestones = (calculatedPct / 100) * mh;
    earnedFromMilestones += fromMilestones;

    // Check for discrepancy
    if (Math.abs(c.percent_complete - calculatedPct) > 0.1) {
      const ik = c.identity_key || {};
      discrepancies.push({
        name: ik.weld_number || c.id,
        stored_pct: c.percent_complete,
        calculated_pct: calculatedPct,
        milestones: milestones,
        mh: mh
      });
    }
  });

  console.log('\nTotal field_weld MH budget:', totalMH.toFixed(2));
  console.log('Earned from percent_complete:', earnedFromPctComplete.toFixed(2));
  console.log('Earned from milestones calculation:', earnedFromMilestones.toFixed(2));
  console.log('Difference:', (earnedFromMilestones - earnedFromPctComplete).toFixed(2));

  if (discrepancies.length > 0) {
    console.log('\n=== DISCREPANCIES (stored vs calculated) ===');
    console.log('Count:', discrepancies.length);
    discrepancies.slice(0, 10).forEach(d => {
      console.log('  Weld ' + d.name + ': stored=' + d.stored_pct + '%, calculated=' + d.calculated_pct.toFixed(1) + '%, mh=' + d.mh.toFixed(2));
      console.log('    milestones:', JSON.stringify(d.milestones));
    });
  }
}

investigate();
