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
      weightsByType[t.component_type][m.name] = m.weight;
    });
  });

  // Get all components with progress
  const { data: components } = await supabase
    .from('components')
    .select('id, component_type, percent_complete, budgeted_manhours, current_milestones')
    .eq('project_id', projectId)
    .eq('is_retired', false)
    .gt('percent_complete', 0);

  console.log('Components with progress:', components.length);

  // Calculate what the delta SHOULD be based on milestone_events
  let totalFromEvents = 0;
  let totalFromPctComplete = 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const c of components) {
    const mh = c.budgeted_manhours || 0;
    totalFromPctComplete += (c.percent_complete / 100) * mh;

    // Get events for this component
    const { data: events } = await supabase
      .from('milestone_events')
      .select('milestone_name, value, previous_value, created_at')
      .eq('component_id', c.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (!events || events.length === 0) continue;

    // Calculate earned MH from events using delta logic
    // Group by milestone to get first/last
    const byMilestone = {};
    events.forEach(e => {
      if (!byMilestone[e.milestone_name]) {
        byMilestone[e.milestone_name] = { first: e, last: e };
      } else {
        byMilestone[e.milestone_name].last = e;
      }
    });

    const weights = weightsByType[c.component_type] || {};

    Object.entries(byMilestone).forEach(([name, data]) => {
      const weight = weights[name] || 0;
      if (weight === 0) return;

      const startVal = data.first.previous_value || 0;
      const endVal = data.last.value || 0;
      const netChange = Math.max(endVal - startVal, 0); // Only positive

      // Convert to MH
      const deltaMH = (netChange / 100) * mh * (weight / 100);
      totalFromEvents += deltaMH;
    });
  }

  console.log('\n=== COMPARISON ===');
  console.log('From components.percent_complete:', totalFromPctComplete.toFixed(2), 'MH');
  console.log('From milestone_events calculation:', totalFromEvents.toFixed(2), 'MH');
  console.log('Gap:', (totalFromPctComplete - totalFromEvents).toFixed(2), 'MH');

  // Check for components where milestones don't match template
  console.log('\n=== CHECKING MILESTONE COVERAGE ===');
  let unmatchedMH = 0;

  for (const c of components.slice(0, 50)) {
    const weights = weightsByType[c.component_type] || {};
    const milestones = c.current_milestones || {};

    Object.entries(milestones).forEach(([name, val]) => {
      if (val > 0 && !weights[name]) {
        // This milestone contributes to percent_complete but has no weight
        unmatchedMH += (c.budgeted_manhours || 0) * 0.01; // rough estimate
      }
    });
  }

  if (unmatchedMH > 0) {
    console.log('Estimated MH from unmatched milestones:', unmatchedMH.toFixed(2));
  }
}

investigate();
