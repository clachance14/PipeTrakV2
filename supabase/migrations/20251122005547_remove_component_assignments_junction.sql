-- Migration: Remove package_component_assignments junction table
-- Reason: Creates relationship ambiguity with components.test_package_id FK
-- Fix: Use components.test_package_id directly for both drawing-based and component-based assignments
-- Feature: 030-test-package-workflow

-- Drop the junction table (causes "more than one relationship" error)
DROP TABLE IF EXISTS package_component_assignments;

-- Note: We keep package_drawing_assignments for tracking which drawings were selected
-- Note: Component assignment (both inherited and direct) uses components.test_package_id FK
