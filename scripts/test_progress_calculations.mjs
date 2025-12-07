// scripts/test_progress_calculations.mjs
// Test suite for progress calculation refactor

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env from .env file
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

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passCount++;
  } else {
    console.log(`✗ ${message}`);
    failCount++;
  }
}

function assertApproxEqual(actual, expected, tolerance, message) {
  if (actual === null || actual === undefined) {
    console.log(`✗ ${message}: got null/undefined, expected ${expected}`);
    failCount++;
    return;
  }
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`✓ ${message}: ${actual} ≈ ${expected} (diff: ${diff.toFixed(4)})`);
    passCount++;
  } else {
    console.log(`✗ ${message}: expected ${expected}, got ${actual} (diff: ${diff.toFixed(4)})`);
    failCount++;
  }
}

// Test Case 1: SPOOL default template, Receive=100, Erect=100
// Template: Receive=5, Erect=40, Connect=40, Punch=5, Test=5, Restore=5
async function test1_defaultTemplate() {
  console.log('\n--- Test 1: SPOOL Default Template (5/40/40/5/5/5) ---');
  console.log('Milestones: Receive=100, Erect=100, all others=0');

  const milestones = {
    Receive: 100,
    Erect: 100,
    Connect: 0,
    Punch: 0,
    Test: 0,
    Restore: 0
  };

  // Test calculate_component_percent (3 params: project_id, component_type, milestones)
  const { data: percentComplete, error: pctError } = await supabase.rpc('calculate_component_percent', {
    p_project_id: null,
    p_component_type: 'spool',
    p_current_milestones: milestones
  });

  if (pctError) {
    console.log(`✗ calculate_component_percent error: ${pctError.message}`);
    failCount++;
    return;
  }

  // Expected: Receive(5) + Erect(40) = 45
  assertApproxEqual(percentComplete, 45, 0.01, 'Percent complete = 45');

  // Test calculate_component_earned_mh
  const { data: earnedMH, error: earnedError } = await supabase.rpc('calculate_component_earned_mh', {
    p_budgeted_manhours: 10,
    p_percent_complete: percentComplete
  });

  if (earnedError) {
    console.log(`✗ calculate_component_earned_mh error: ${earnedError.message}`);
    failCount++;
    return;
  }

  // Expected: 10 * 45 / 100 = 4.5
  assertApproxEqual(earnedMH, 4.5, 0.01, 'Earned MH = 4.5');

  // Test calculate_category_earned_mh (returns table)
  const { data: categoryEarned, error: catError } = await supabase.rpc('calculate_category_earned_mh', {
    p_project_id: null,
    p_component_type: 'spool',
    p_current_milestones: milestones,
    p_budgeted_manhours: 10
  });

  if (catError) {
    console.log(`✗ calculate_category_earned_mh error: ${catError.message}`);
    failCount++;
    return;
  }

  // Find categories
  const receive = categoryEarned.find(c => c.category === 'receive');
  const install = categoryEarned.find(c => c.category === 'install');
  const punch = categoryEarned.find(c => c.category === 'punch');
  const test = categoryEarned.find(c => c.category === 'test');
  const restore = categoryEarned.find(c => c.category === 'restore');

  // receive_earned = 10 * 0.05 * 1.0 = 0.5
  assertApproxEqual(receive?.earned_mh, 0.5, 0.01, 'receive_earned = 0.5');

  // install_earned = 10 * 0.80 * 0.5 = 4.0 (only Erect=100 of Erect+Connect)
  assertApproxEqual(install?.earned_mh, 4.0, 0.01, 'install_earned = 4.0');

  assertApproxEqual(punch?.earned_mh, 0, 0.01, 'punch_earned = 0');
  assertApproxEqual(test?.earned_mh, 0, 0.01, 'test_earned = 0');
  assertApproxEqual(restore?.earned_mh, 0, 0.01, 'restore_earned = 0');

  // Verify category sum
  const categorySum = categoryEarned.reduce((sum, c) => sum + (c.earned_mh || 0), 0);
  assertApproxEqual(categorySum, earnedMH, 0.01, 'Category sum ≈ earned_mh');

  // Test verify_category_mh_sum
  const { data: sanityCheck, error: sanityError } = await supabase.rpc('verify_category_mh_sum', {
    p_project_id: null,
    p_component_type: 'spool',
    p_current_milestones: milestones,
    p_budgeted_manhours: 10,
    p_tolerance: 0.01
  });

  if (sanityError) {
    console.log(`✗ verify_category_mh_sum error: ${sanityError.message}`);
    failCount++;
    return;
  }

  assert(sanityCheck === true, 'Sanity check passed');
}

// Test Case 2: Custom template (Dark Knight project)
async function test2_customTemplate() {
  console.log('\n--- Test 2: Custom Project Template ---');

  // Find the Dark Knight project
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', '%dark knight%')
    .limit(1);

  if (projectError || !projects || projects.length === 0) {
    console.log('⊘ Skipping Test 2: Dark Knight project not found');
    return;
  }

  const projectId = projects[0].id;
  console.log(`Using project: ${projects[0].name}`);

  // Check if custom template exists
  const { data: templates } = await supabase
    .from('project_progress_templates')
    .select('*')
    .eq('project_id', projectId)
    .eq('component_type', 'spool');

  if (!templates || templates.length === 0) {
    console.log('⊘ Skipping Test 2: No custom templates for Dark Knight');
    return;
  }

  console.log(`Found ${templates.length} custom template milestones`);

  const milestones = {
    Receive: 100,
    Erect: 100,
    Connect: 0,
    Punch: 0,
    Test: 0,
    Restore: 0
  };

  // Test with custom template
  const { data: percentComplete, error: pctError } = await supabase.rpc('calculate_component_percent', {
    p_project_id: projectId,
    p_component_type: 'spool',
    p_current_milestones: milestones
  });

  if (pctError) {
    console.log(`✗ calculate_component_percent error: ${pctError.message}`);
    failCount++;
    return;
  }

  console.log(`Custom template percent complete: ${percentComplete}`);
  assert(percentComplete !== null, 'Custom template calculation works');

  // Verify sanity check passes
  const { data: sanityCheck } = await supabase.rpc('verify_category_mh_sum', {
    p_project_id: projectId,
    p_component_type: 'spool',
    p_current_milestones: milestones,
    p_budgeted_manhours: 10,
    p_tolerance: 0.01
  });

  assert(sanityCheck === true, 'Custom template sanity check passed');
}

// Test Case 3: Field weld (no receive category)
async function test3_fieldWeld() {
  console.log('\n--- Test 3: Field Weld (No Receive Category) ---');

  // Note: Field weld milestone names are 'Fit-up' (lowercase) and 'Weld Complete'
  const milestones = {
    'Fit-up': 100,
    'Weld Complete': 100,
    'Punch': 0,
    'Test': 0,
    'Restore': 0
  };

  const { data: percentComplete, error: pctError } = await supabase.rpc('calculate_component_percent', {
    p_project_id: null,
    p_component_type: 'field_weld',
    p_current_milestones: milestones
  });

  if (pctError) {
    console.log(`✗ calculate_component_percent error: ${pctError.message}`);
    failCount++;
    return;
  }

  // Field weld template: Fit-Up=10, Weld Made=60, Punch=10, Test=15, Restore=5
  // Expected: 10 + 60 = 70
  assertApproxEqual(percentComplete, 70, 0.01, 'Field weld percent = 70');

  // Check category breakdown
  const { data: categoryEarned } = await supabase.rpc('calculate_category_earned_mh', {
    p_project_id: null,
    p_component_type: 'field_weld',
    p_current_milestones: milestones,
    p_budgeted_manhours: 10
  });

  const receive = categoryEarned?.find(c => c.category === 'receive');
  const install = categoryEarned?.find(c => c.category === 'install');

  // Field welds have 0 receive weight
  assertApproxEqual(receive?.earned_mh, 0, 0.01, 'Field weld receive_earned = 0');

  // install_earned = 10 * 0.70 * 1.0 = 7.0 (Fit-Up + Weld Made both 100%)
  assertApproxEqual(install?.earned_mh, 7.0, 0.01, 'Field weld install_earned = 7.0');

  // Verify sanity check
  const { data: sanityCheck } = await supabase.rpc('verify_category_mh_sum', {
    p_project_id: null,
    p_component_type: 'field_weld',
    p_current_milestones: milestones,
    p_budgeted_manhours: 10,
    p_tolerance: 0.01
  });

  assert(sanityCheck === true, 'Field weld sanity check passed');
}

// Test Case 4: Edge cases
async function test4_edgeCases() {
  console.log('\n--- Test 4: Edge Cases ---');

  // All zeros
  const zeroMilestones = {
    Receive: 0, Erect: 0, Connect: 0, Punch: 0, Test: 0, Restore: 0
  };

  const { data: zeroPct } = await supabase.rpc('calculate_component_percent', {
    p_project_id: null,
    p_component_type: 'spool',
    p_current_milestones: zeroMilestones
  });

  assertApproxEqual(zeroPct, 0, 0.01, 'All zeros = 0%');

  // All 100s
  const fullMilestones = {
    Receive: 100, Erect: 100, Connect: 100, Punch: 100, Test: 100, Restore: 100
  };

  const { data: fullPct } = await supabase.rpc('calculate_component_percent', {
    p_project_id: null,
    p_component_type: 'spool',
    p_current_milestones: fullMilestones
  });

  assertApproxEqual(fullPct, 100, 0.01, 'All 100s = 100%');

  // Zero budget
  const { data: zeroEarned } = await supabase.rpc('calculate_component_earned_mh', {
    p_budgeted_manhours: 0,
    p_percent_complete: 100
  });

  assertApproxEqual(zeroEarned, 0, 0.01, 'Zero budget = 0 earned');

  // Null handling
  const { data: nullPct } = await supabase.rpc('calculate_component_percent', {
    p_project_id: null,
    p_component_type: 'spool',
    p_current_milestones: {}
  });

  assertApproxEqual(nullPct, 0, 0.01, 'Empty milestones = 0%');
}

// Test Case 5: Template lookup with get_component_template
async function test5_templateLookup() {
  console.log('\n--- Test 5: Template Lookup ---');

  // Test default template lookup
  const { data: template, error } = await supabase.rpc('get_component_template', {
    p_project_id: null,
    p_component_type: 'spool'
  });

  if (error) {
    console.log(`✗ get_component_template error: ${error.message}`);
    failCount++;
    return;
  }

  assert(template && template.length > 0, 'Template returned milestones');

  // Verify template has category column
  const hasCategory = template.every(m => m.category !== undefined);
  assert(hasCategory, 'All milestones have category');

  // Verify weights sum to 100
  const weightSum = template.reduce((sum, m) => sum + (m.weight || 0), 0);
  assertApproxEqual(weightSum, 100, 0.01, 'Template weights sum to 100');

  // Verify categories are valid
  const validCategories = ['receive', 'install', 'punch', 'test', 'restore'];
  const allValidCategories = template.every(m => m.category === null || validCategories.includes(m.category));
  assert(allValidCategories, 'All categories are valid');
}

// Test Case 6: View data validation
async function test6_viewValidation() {
  console.log('\n--- Test 6: View Data Validation ---');

  // Test vw_manhour_progress_by_area
  const { data: areaProgress, error: areaError } = await supabase
    .from('vw_manhour_progress_by_area')
    .select('*')
    .limit(5);

  if (areaError) {
    console.log(`✗ vw_manhour_progress_by_area error: ${areaError.message}`);
    failCount++;
  } else {
    assert(true, 'vw_manhour_progress_by_area accessible');

    // Verify columns exist
    if (areaProgress && areaProgress.length > 0) {
      const row = areaProgress[0];
      assert('receive_mh_earned' in row, 'View has receive_mh_earned');
      assert('install_mh_earned' in row, 'View has install_mh_earned');
      assert('total_mh_earned' in row, 'View has total_mh_earned');
    }
  }

  // Test vw_project_progress
  const { data: projectProgress, error: projError } = await supabase
    .from('vw_project_progress')
    .select('*')
    .limit(5);

  if (projError) {
    console.log(`⊘ vw_project_progress not accessible (may not exist): ${projError.message}`);
  } else {
    assert(true, 'vw_project_progress accessible');
  }
}

// Run all tests
async function runAllTests() {
  console.log('=== Progress Calculation Refactor Tests ===');
  console.log('Testing unified template-driven calculations\n');

  try {
    await test1_defaultTemplate();
    await test2_customTemplate();
    await test3_fieldWeld();
    await test4_edgeCases();
    await test5_templateLookup();
    await test6_viewValidation();

    console.log('\n=== Results ===');
    console.log(`✓ Passed: ${passCount}`);
    console.log(`✗ Failed: ${failCount}`);
    console.log(`Total: ${passCount + failCount}`);

    if (failCount > 0) {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  }
}

runAllTests().catch(console.error);
