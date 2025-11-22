-- Migration 00125: Update component foreign key constraint
-- Purpose: Ensure components are freed when package is deleted
-- Feature: 030-test-package-workflow

-- Note: Component uniqueness (one component per package) is ALREADY enforced by the fact that
-- test_package_id is a foreign key column. Multiple components CAN belong to the same package.
-- The design requires enforcing that a component belongs to AT MOST ONE package at a time.
-- This is already satisfied by the FK column being non-array single value.

-- Update foreign key with SET NULL on delete - frees components when package deleted
ALTER TABLE components
DROP CONSTRAINT IF EXISTS fk_components_test_package;

ALTER TABLE components
ADD CONSTRAINT fk_components_test_package
FOREIGN KEY (test_package_id)
REFERENCES test_packages(id)
ON DELETE SET NULL;
