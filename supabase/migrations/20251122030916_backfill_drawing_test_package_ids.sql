-- Migration: Backfill drawing test_package_id based on component assignments
-- Purpose: Fix existing test packages (like TP-5) to show in drawing rows
-- Date: 2025-11-22
--
-- Context: drawings.test_package_id was added in migration 00022, but existing
-- test packages only set components.test_package_id, not drawings.test_package_id.
-- This migration backfills drawings.test_package_id based on which test package
-- the majority of components on that drawing are assigned to.
--
-- Strategy:
-- For each drawing, find the test_package_id that has the most components assigned,
-- and set drawings.test_package_id to that value.

-- Update drawings.test_package_id based on the most common test_package_id among components
UPDATE drawings d
SET test_package_id = (
  SELECT c.test_package_id
  FROM components c
  WHERE c.drawing_id = d.id
    AND c.test_package_id IS NOT NULL
    AND c.is_retired = false
  GROUP BY c.test_package_id
  ORDER BY COUNT(*) DESC
  LIMIT 1
)
WHERE d.test_package_id IS NULL  -- Only update drawings without a test package
  AND d.is_retired = false
  AND EXISTS (
    -- Only update if drawing has components with test_package_id
    SELECT 1
    FROM components c
    WHERE c.drawing_id = d.id
      AND c.test_package_id IS NOT NULL
      AND c.is_retired = false
  );

-- Log results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled test_package_id for % drawings', updated_count;
END $$;

COMMENT ON COLUMN drawings.test_package_id IS 'Test package assignment for entire drawing (backfilled from component assignments in migration 20251122030916)';
