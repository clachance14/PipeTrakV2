-- Add xray_percentage column to field_welds table
-- This stores the X-RAY % value from Excel imports (5%, 10%, 100%, or custom)

-- Step 1: Add the column (nullable initially)
ALTER TABLE field_welds
ADD COLUMN xray_percentage NUMERIC(5,2)
CHECK (xray_percentage >= 0 AND xray_percentage <= 100);

-- Step 2: Set all existing welds to 5% xray (per client requirement)
UPDATE field_welds
SET xray_percentage = 5.0
WHERE xray_percentage IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN field_welds.xray_percentage IS 'X-ray percentage requirement for this weld (e.g., 5.0 for 5%, 10.0 for 10%, 100.0 for 100%). Common values are 5%, 10%, and 100%.';
