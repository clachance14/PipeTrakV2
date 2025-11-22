-- Migration: Remove duplicate foreign key constraint
-- Reason: Migration 00125 created fk_components_test_package but didn't drop the original components_test_package_id_fkey
-- This causes PostgREST error: "more than one relationship was found for 'components' and 'test_packages'"
-- Feature: 030-test-package-workflow

-- Drop the original auto-generated constraint
-- Keep fk_components_test_package (with ON DELETE SET NULL behavior)
ALTER TABLE components
DROP CONSTRAINT IF EXISTS components_test_package_id_fkey;

-- Verify only one FK remains
-- Expected: fk_components_test_package with ON DELETE SET NULL
