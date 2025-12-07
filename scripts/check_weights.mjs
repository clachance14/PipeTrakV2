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

  // Get templates
  const { data: templates } = await supabase
    .from('progress_templates')
    .select('component_type, milestones_config')
    .eq('version', 1);

  const weightsByType = {};
  templates.forEach(t => {
    weightsByType[t.component_type] = {};
    t.milestones_config.forEach(m => {
      weightsByType[t.component_type][m.name.toLowerCase()] = m.weight;
    });
  });

  console.log('\nTemplates loaded for:', Object.keys(weightsByType).join(', '));

  // Get unique milestone names from events
  const { data: events } = await supabase
    .from('milestone_events')
    .select('milestone_name, components!inner(component_type, project_id)')
    .eq('components.project_id', projectId);

  // Check weight lookup
  const combos = new Map();
  events.forEach(e => {
    const key = e.components.component_type + '|' + e.milestone_name;
    if (!combos.has(key)) {
      combos.set(key, { type: e.components.component_type, name: e.milestone_name, count: 0 });
    }
    combos.get(key).count++;
  });

  console.log('\n=== WEIGHT LOOKUP CHECK ===');

  for (const [key, data] of combos) {
    const typeWeights = weightsByType[data.type] || {};
    const weight = typeWeights[data.name.toLowerCase()];
    const status = weight ? '✓' : '✗ NO WEIGHT';
    console.log(status + ' ' + data.type + '/' + data.name + ' -> weight=' + (weight || 0) + ' (' + data.count + ' events)');
  }

  // Show template for field_weld
  console.log('\n=== field_weld template ===');
  console.log(JSON.stringify(weightsByType['field_weld'], null, 2));
}

investigate();
