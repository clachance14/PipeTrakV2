import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseServiceKey = '';

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).trim();
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Get ALL progress templates (defaults)
const { data: templates } = await supabase
  .from('progress_templates')
  .select('*')
  .order('component_type');

console.log('='.repeat(100));
console.log('DEFAULT PROGRESS TEMPLATES (from progress_templates table)');
console.log('='.repeat(100));

for (const t of templates) {
  console.log('');
  console.log(t.component_type.toUpperCase() + ' (workflow: ' + t.workflow_type + ')');
  console.log('-'.repeat(60));
  console.log('Milestone'.padEnd(20) + 'Weight'.padStart(8) + 'Order'.padStart(8) + 'Partial'.padStart(10) + 'Welder Req'.padStart(12));
  console.log('-'.repeat(60));

  const milestones = t.milestones_config || [];
  milestones.sort((a, b) => a.order - b.order);

  let total = 0;
  for (const m of milestones) {
    console.log(
      m.name.padEnd(20) +
      (m.weight + '%').padStart(8) +
      m.order.toString().padStart(8) +
      (m.is_partial ? 'Yes' : 'No').padStart(10) +
      (m.requires_welder ? 'Yes' : 'No').padStart(12)
    );
    total += m.weight;
  }
  console.log('-'.repeat(60));
  console.log('TOTAL'.padEnd(20) + (total + '%').padStart(8));
}

// Get project-specific templates for Dark Knight 1605
const { data: projects } = await supabase
  .from('projects')
  .select('id, name')
  .ilike('name', '%1605%dark knight%');

if (projects && projects.length > 0) {
  const projectId = projects[0].id;

  const { data: ppt } = await supabase
    .from('project_progress_templates')
    .select('*')
    .eq('project_id', projectId)
    .order('component_type')
    .order('milestone_order');

  if (ppt && ppt.length > 0) {
    console.log('');
    console.log('');
    console.log('='.repeat(100));
    console.log('PROJECT-SPECIFIC TEMPLATES: ' + projects[0].name);
    console.log('='.repeat(100));

    // Group by component_type
    const byType = {};
    for (const row of ppt) {
      if (!byType[row.component_type]) byType[row.component_type] = [];
      byType[row.component_type].push(row);
    }

    for (const [type, rows] of Object.entries(byType).sort()) {
      console.log('');
      console.log(type.toUpperCase());
      console.log('-'.repeat(60));
      console.log('Milestone'.padEnd(20) + 'Weight'.padStart(8) + 'Order'.padStart(8) + 'Partial'.padStart(10) + 'Welder Req'.padStart(12));
      console.log('-'.repeat(60));

      rows.sort((a, b) => a.milestone_order - b.milestone_order);
      let total = 0;
      for (const row of rows) {
        console.log(
          row.milestone_name.padEnd(20) +
          (row.weight + '%').padStart(8) +
          row.milestone_order.toString().padStart(8) +
          (row.is_partial ? 'Yes' : 'No').padStart(10) +
          (row.requires_welder ? 'Yes' : 'No').padStart(12)
        );
        total += row.weight;
      }
      console.log('-'.repeat(60));
      console.log('TOTAL'.padEnd(20) + (total + '%').padStart(8));
    }
  }
}

// Show category mappings used by manhour views
console.log('');
console.log('');
console.log('='.repeat(100));
console.log('MANHOUR CATEGORY MAPPINGS');
console.log('(How milestones map to the 5 manhour categories: Receive, Install, Punch, Test, Restore)');
console.log('='.repeat(100));

const categoryMappings = {
  'spool': {
    'Receive': ['Receive'],
    'Install': ['Erect', 'Connect'],
    'Punch': ['Punch', 'Punch Complete'],
    'Test': ['Test', 'Hydrotest'],
    'Restore': ['Restore']
  },
  'field_weld': {
    'Receive': [],  // No receive milestone
    'Install': ['Fit-up', 'Weld Complete'],
    'Punch': ['Punch', 'Accepted'],
    'Test': ['Test'],
    'Restore': ['Restore']
  },
  'valve': {
    'Receive': ['Receive'],
    'Install': ['Install'],
    'Punch': ['Punch', 'Punch Complete', 'Test Complete'],
    'Test': ['Test'],
    'Restore': ['Restore']
  },
  'instrument': {
    'Receive': ['Receive'],
    'Install': ['Install'],
    'Punch': ['Punch', 'Punch Complete'],
    'Test': ['Test'],
    'Restore': ['Restore']
  },
  'support': {
    'Receive': ['Receive'],
    'Install': ['Install'],
    'Punch': ['Punch', 'Punch Complete', 'Test Complete'],
    'Test': ['Test'],
    'Restore': ['Restore', 'Insulate']
  },
  'threaded_pipe': {
    'Receive': ['Receive'],
    'Install': ['Fabricate', 'Install', 'Erect', 'Connect', 'Support'],
    'Punch': ['Punch'],
    'Test': ['Test'],
    'Restore': ['Restore']
  }
};

for (const [compType, cats] of Object.entries(categoryMappings)) {
  console.log('');
  console.log(compType.toUpperCase());
  console.log('-'.repeat(60));
  for (const [cat, milestones] of Object.entries(cats)) {
    const milestoneList = milestones.length > 0 ? milestones.join(', ') : '(none)';
    console.log('  ' + cat.padEnd(12) + ' <- ' + milestoneList);
  }
}

// Explain the calculation formulas
console.log('');
console.log('');
console.log('='.repeat(100));
console.log('CALCULATION FORMULAS');
console.log('='.repeat(100));

console.log(`
1. PERCENT COMPLETE (stored on component)
   ----------------------------------------
   Function: calculate_component_percent()
   Source: project_progress_templates (if exists) OR progress_templates

   Formula:
     percent_complete = SUM(milestone_weight) for each completed milestone

   Example (Spool with Receive=100, Erect=100):
     - If project template: Receive=2%, Erect=41%
     - percent_complete = 2 + 41 = 43%

2. EARNED MANHOURS (dashboard)
   ----------------------------------------
   Source: components table directly

   Formula:
     earned_mh = budgeted_manhours * percent_complete / 100

   Example (Spool with 10 MH budget, 43% complete):
     - earned_mh = 10 * 43 / 100 = 4.30 MH

3. EARNED MANHOURS BY CATEGORY (reports/views)
   ----------------------------------------
   Function: calculate_earned_milestone_value() + get_category_weight()
   Source: views (vw_manhour_progress_by_area, etc.)

   For each category (Receive, Install, Punch, Test, Restore):
     category_weight = get_category_weight(project_id, component_type, category)
     category_pct = calculate_earned_milestone_value(component_type, milestones, category)
     category_earned = budgeted_mh * category_weight * category_pct / 100

   Total Earned = receive_earned + install_earned + punch_earned + test_earned + restore_earned

   Example (Spool with 10 MH, Receive=100, Erect=100):
     - receive_weight = 0.02 (2%), receive_pct = 100%
     - install_weight = 0.82 (41%+41%), install_pct = 50% (Erect only, not Connect)
     - receive_earned = 10 * 0.02 * 100 / 100 = 0.20 MH
     - install_earned = 10 * 0.82 * 50 / 100 = 4.10 MH
     - Total = 0.20 + 4.10 = 4.30 MH

4. PROJECT PERCENT COMPLETE
   ----------------------------------------
   Formula:
     project_pct = SUM(earned_mh) / total_budget * 100

   Where total_budget comes from project_manhour_budgets (if exists)
   OR SUM(budgeted_manhours) from components
`);
