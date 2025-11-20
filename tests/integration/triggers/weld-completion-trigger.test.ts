// tests/integration/triggers/weld-completion-trigger.test.ts
//
// Integration tests for the QC weld completion notification trigger.
// Verifies that needs_review entries are automatically created when date_welded
// is set on field welds, and that the trigger correctly handles NULL welder_id
// and prevents duplicate notifications.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
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

describe('Weld Completion Trigger', () => {
  let testProjectId: string;
  let testComponentId: string;
  let testWeldId: string;
  let testDrawingId: string;
  let testOrgId: string;
  let testProgressTemplateId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Get or create test organization
    const { data: existingOrgs } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (existingOrgs && existingOrgs.length > 0) {
      testOrgId = existingOrgs[0].id;
    } else {
      const { data: newOrg } = await supabase
        .from('organizations')
        .insert({ name: 'Test Org' })
        .select()
        .single();
      testOrgId = newOrg!.id;
    }

    // Get a test user
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    testUserId = users![0].id;

    // Get progress template for field_weld
    const { data: template } = await supabase
      .from('progress_templates')
      .select('id')
      .eq('component_type', 'field_weld')
      .single();
    testProgressTemplateId = template!.id;

    // Create test project
    const { data: project } = await supabase
      .from('projects')
      .insert({ name: 'Test Project', organization_id: testOrgId })
      .select()
      .single();
    testProjectId = project!.id;

    // Create test drawing
    const { data: drawing } = await supabase
      .from('drawings')
      .insert({
        project_id: testProjectId,
        drawing_no_raw: 'DWG-TEST-001',
        drawing_no_norm: 'DWGTEST001' // Required NOT NULL field
      })
      .select()
      .single();
    testDrawingId = drawing!.id;

    // Create test component
    const { data: component } = await supabase
      .from('components')
      .insert({
        project_id: testProjectId,
        drawing_id: testDrawingId,
        identity_key: { weld_number: 'W-TEST-001' },
        component_type: 'field_weld',
        progress_template_id: testProgressTemplateId
      })
      .select()
      .single();
    testComponentId = component!.id;

    // Create test field weld (date_welded = NULL)
    const { data: weld } = await supabase
      .from('field_welds')
      .insert({
        project_id: testProjectId,
        component_id: testComponentId,
        weld_type: 'BW',
        weld_size: '1/4"',
        spec: 'A106-B',
        nde_required: false,
        date_welded: null, // NULL initially
        created_by: testUserId
      })
      .select()
      .single();
    testWeldId = weld!.id;
  });

  afterEach(async () => {
    // Cleanup in reverse order (foreign keys)
    await supabase.from('needs_review').delete().eq('project_id', testProjectId);
    await supabase.from('field_welds').delete().eq('id', testWeldId);
    await supabase.from('components').delete().eq('id', testComponentId);
    await supabase.from('drawings').delete().eq('id', testDrawingId);
    await supabase.from('projects').delete().eq('id', testProjectId);
  });

  it('creates needs_review entry when date_welded is set', async () => {
    // Update date_welded from NULL to a date
    await supabase
      .from('field_welds')
      .update({ date_welded: '2025-11-20' })
      .eq('id', testWeldId);

    // Verify needs_review entry created
    const { data: reviews } = await supabase
      .from('needs_review')
      .select('*')
      .eq('type', 'weld_completed')
      .eq('project_id', testProjectId);

    expect(reviews).toHaveLength(1);
    expect(reviews![0].status).toBe('pending');
    expect(reviews![0].payload.weld_id).toBe(testWeldId);
    expect(reviews![0].payload.weld_number).toBe('W-TEST-001');
    expect(reviews![0].payload.drawing_number).toBe('DWG-TEST-001');
    expect(reviews![0].payload.date_welded).toBe('2025-11-20');
    expect(reviews![0].payload.weld_type).toBe('BW');
    expect(reviews![0].payload.nde_required).toBe(false);
    expect(reviews![0].payload.component_id).toBe(testComponentId);
  });

  it('does not create duplicate review when date_welded updated again', async () => {
    // First update: NULL -> date
    await supabase
      .from('field_welds')
      .update({ date_welded: '2025-11-20' })
      .eq('id', testWeldId);

    // Second update: date -> different date
    await supabase
      .from('field_welds')
      .update({ date_welded: '2025-11-21' })
      .eq('id', testWeldId);

    // Verify only ONE review exists
    const { data: reviews } = await supabase
      .from('needs_review')
      .select('*')
      .eq('type', 'weld_completed')
      .eq('project_id', testProjectId);

    expect(reviews).toHaveLength(1);
  });

  it('handles null welder_id gracefully', async () => {
    // Update date_welded without setting welder_id
    await supabase
      .from('field_welds')
      .update({ date_welded: '2025-11-20' })
      .eq('id', testWeldId);

    // Verify review created with null welder fields
    const { data: reviews } = await supabase
      .from('needs_review')
      .select('*')
      .eq('type', 'weld_completed')
      .eq('project_id', testProjectId);

    expect(reviews![0].payload.welder_id).toBeNull();
    expect(reviews![0].payload.welder_name).toBeNull();
  });
});
