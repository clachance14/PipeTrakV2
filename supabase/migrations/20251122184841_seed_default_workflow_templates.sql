-- Migration: Seed default workflow templates
-- Purpose: Provide sensible defaults for each test type
-- Feature: Test Package Workflow Logic Matrix
-- Note: These defaults can be modified by admins via UI

-- Hydrostatic Test: Full workflow (all hydro stages)
INSERT INTO package_workflow_templates (test_type, stage_name, stage_order, is_required) VALUES
  ('Hydrostatic Test', 'Pre-Hydro Acceptance', 1, true),
  ('Hydrostatic Test', 'Test Acceptance', 2, true),
  ('Hydrostatic Test', 'Drain/Flush Acceptance', 3, true),
  ('Hydrostatic Test', 'Post-Hydro Acceptance', 4, true),
  ('Hydrostatic Test', 'Final Package Acceptance', 5, true)
ON CONFLICT (test_type, stage_name) DO NOTHING;

-- Pneumatic Test: Skip drain/flush (no water involved)
INSERT INTO package_workflow_templates (test_type, stage_name, stage_order, is_required) VALUES
  ('Pneumatic Test', 'Pre-Hydro Acceptance', 1, true),
  ('Pneumatic Test', 'Test Acceptance', 2, true),
  ('Pneumatic Test', 'Post-Hydro Acceptance', 3, true),
  ('Pneumatic Test', 'Final Package Acceptance', 4, true)
ON CONFLICT (test_type, stage_name) DO NOTHING;

-- In-service Test: Minimal workflow (already installed)
INSERT INTO package_workflow_templates (test_type, stage_name, stage_order, is_required) VALUES
  ('In-service Test', 'Final Package Acceptance', 1, true)
ON CONFLICT (test_type, stage_name) DO NOTHING;

-- Sensitive Leak Test: Pre-test + Test + Final
INSERT INTO package_workflow_templates (test_type, stage_name, stage_order, is_required) VALUES
  ('Sensitive Leak Test', 'Pre-Hydro Acceptance', 1, true),
  ('Sensitive Leak Test', 'Test Acceptance', 2, true),
  ('Sensitive Leak Test', 'Final Package Acceptance', 3, true)
ON CONFLICT (test_type, stage_name) DO NOTHING;

-- Alternative Leak Test: Same as Sensitive
INSERT INTO package_workflow_templates (test_type, stage_name, stage_order, is_required) VALUES
  ('Alternative Leak Test', 'Pre-Hydro Acceptance', 1, true),
  ('Alternative Leak Test', 'Test Acceptance', 2, true),
  ('Alternative Leak Test', 'Final Package Acceptance', 3, true)
ON CONFLICT (test_type, stage_name) DO NOTHING;

-- Other: Full workflow as default (safest assumption)
INSERT INTO package_workflow_templates (test_type, stage_name, stage_order, is_required) VALUES
  ('Other', 'Pre-Hydro Acceptance', 1, true),
  ('Other', 'Test Acceptance', 2, true),
  ('Other', 'Drain/Flush Acceptance', 3, true),
  ('Other', 'Post-Hydro Acceptance', 4, true),
  ('Other', 'Final Package Acceptance', 5, true)
ON CONFLICT (test_type, stage_name) DO NOTHING;
