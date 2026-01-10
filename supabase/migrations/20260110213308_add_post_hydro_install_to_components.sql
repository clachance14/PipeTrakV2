-- Migration: Add post_hydro_install flag to components table
-- Purpose: Allow marking components for installation after hydrotest
-- These components remain in the test package but don't block test readiness

-- Add post_hydro_install boolean column with default FALSE
ALTER TABLE components
ADD COLUMN post_hydro_install BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for efficient filtering in package readiness queries
-- Partial index only on components that are assigned to a test package
CREATE INDEX idx_components_post_hydro
ON components(test_package_id, post_hydro_install)
WHERE test_package_id IS NOT NULL;

-- Document the column purpose
COMMENT ON COLUMN components.post_hydro_install IS
'When TRUE, component should be installed after hydrotest. Does not count toward test readiness but still earns manhours.';
