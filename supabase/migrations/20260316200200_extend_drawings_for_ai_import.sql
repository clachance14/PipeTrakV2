-- Extend drawings table with title block metadata columns for AI drawing import
-- Also adds sheet_number to the unique constraint so multi-sheet drawings can coexist

-- New columns for title block metadata
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS sheet_number TEXT DEFAULT '1';
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS line_number TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS spec TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS nde_class TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS pwht BOOLEAN DEFAULT false;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS hydro TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS insulation TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS processing_status TEXT
  CHECK (processing_status IN ('queued', 'processing', 'complete', 'error'));
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS processing_note TEXT;

-- Update unique constraint to include sheet_number
-- Old: (project_id, drawing_no_norm) WHERE NOT is_retired
-- New: (project_id, drawing_no_norm, sheet_number) WHERE NOT is_retired
DROP INDEX IF EXISTS idx_drawings_project_norm;
CREATE UNIQUE INDEX idx_drawings_project_norm
  ON drawings(project_id, drawing_no_norm, sheet_number)
  WHERE NOT is_retired;
