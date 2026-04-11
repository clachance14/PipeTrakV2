-- Add subsection column to drawing_bom_items for BOM section hierarchy
-- Valid values: 'line_items', 'pipe_supports', 'instruments'
ALTER TABLE drawing_bom_items
  ADD COLUMN IF NOT EXISTS subsection TEXT;

-- Add drawing_type to drawings table for ISO vs Trim detection
ALTER TABLE drawings
  ADD COLUMN IF NOT EXISTS drawing_type TEXT
  CHECK (drawing_type IN ('iso', 'trim', 'other'));

-- Add has_spools flag to drawings (from title block extraction)
ALTER TABLE drawings
  ADD COLUMN IF NOT EXISTS has_spools BOOLEAN;

COMMENT ON COLUMN drawing_bom_items.subsection IS 'BOM subsection header: line_items, pipe_supports, or instruments. Determines item context within shop/field section.';
COMMENT ON COLUMN drawings.drawing_type IS 'Drawing type detected by AI: iso (piping isometric), trim (piping trim), other';
COMMENT ON COLUMN drawings.has_spools IS 'Whether spool callout labels were detected on the drawing diagram';
