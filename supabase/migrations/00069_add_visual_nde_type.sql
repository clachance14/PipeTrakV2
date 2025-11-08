-- Migration: Add Visual (VT) NDE type to field_welds table
-- Date: 2025-10-30
-- Description: Extends the nde_type CHECK constraint to include 'VT' (Visual Testing)

-- Drop existing CHECK constraint on nde_type
ALTER TABLE field_welds
  DROP CONSTRAINT IF EXISTS field_welds_nde_type_check;

-- Add new CHECK constraint with VT included
ALTER TABLE field_welds
  ADD CONSTRAINT field_welds_nde_type_check
  CHECK (nde_type IN ('RT', 'UT', 'PT', 'MT', 'VT') OR nde_type IS NULL);

-- Add comment documenting NDE types
COMMENT ON COLUMN field_welds.nde_type IS 'Non-Destructive Examination type: RT (Radiographic), UT (Ultrasonic), PT (Penetrant), MT (Magnetic), VT (Visual)';
