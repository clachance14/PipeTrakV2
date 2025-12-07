-- Phase 1: Schema Updates - Add category column to template tables

-- Task 1.1: Add category column to progress_templates (nullable first)
ALTER TABLE progress_templates
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add permissive CHECK (allows NULL, validates when present)
ALTER TABLE progress_templates
ADD CONSTRAINT chk_progress_templates_category
CHECK (category IS NULL OR category IN ('receive', 'install', 'punch', 'test', 'restore'));

-- Task 1.2: Add category column to project_progress_templates (nullable first)
ALTER TABLE project_progress_templates
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add permissive CHECK
ALTER TABLE project_progress_templates
ADD CONSTRAINT chk_project_templates_category
CHECK (category IS NULL OR category IN ('receive', 'install', 'punch', 'test', 'restore'));

-- Task 1.3: Backfill category values
-- For progress_templates (JSONB milestones_config)
-- Add category to each milestone object in milestones_config
UPDATE progress_templates
SET milestones_config = (
  SELECT jsonb_agg(
    m || jsonb_build_object('category',
      CASE m->>'name'
        WHEN 'Receive' THEN 'receive'
        WHEN 'Erect' THEN 'install'
        WHEN 'Connect' THEN 'install'
        WHEN 'Install' THEN 'install'
        WHEN 'Fit-Up' THEN 'install'
        WHEN 'Weld Made' THEN 'install'
        WHEN 'Fabricate' THEN 'install'
        WHEN 'Support' THEN 'install'
        WHEN 'Punch' THEN 'punch'
        WHEN 'Punch Complete' THEN 'punch'
        WHEN 'Test' THEN 'test'
        WHEN 'Hydrotest' THEN 'test'
        WHEN 'Restore' THEN 'restore'
        WHEN 'Insulate' THEN 'restore'
        ELSE NULL
      END
    )
  )
  FROM jsonb_array_elements(milestones_config) m
);

-- For project_progress_templates (simple column update)
UPDATE project_progress_templates SET category = 'receive' WHERE milestone_name = 'Receive';
UPDATE project_progress_templates SET category = 'install' WHERE milestone_name IN ('Erect', 'Connect', 'Install', 'Fit-Up', 'Weld Made', 'Weld Complete', 'Fit-up', 'Fabricate', 'Support');
UPDATE project_progress_templates SET category = 'punch' WHERE milestone_name IN ('Punch', 'Punch Complete', 'Accepted');
UPDATE project_progress_templates SET category = 'test' WHERE milestone_name IN ('Test', 'Hydrotest');
UPDATE project_progress_templates SET category = 'restore' WHERE milestone_name IN ('Restore', 'Insulate');
