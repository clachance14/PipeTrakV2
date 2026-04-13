-- Add source_page column to track which page in the original multi-page PDF
-- this drawing was extracted from. Distinct from sheet_number which is the
-- sheet number shown on the drawing itself (from the title block).
--
-- Example: A 4-page PDF might contain:
--   Page 1: Drawing A-100 Sheet 1 of 2  → source_page=1, sheet_number='1'
--   Page 2: Drawing A-100 Sheet 2 of 2  → source_page=2, sheet_number='2'
--   Page 3: Drawing B-200 Sheet 1 of 1  → source_page=3, sheet_number='1'
--   Page 4: Drawing C-300 Sheet 1 of 1  → source_page=4, sheet_number='1'
--
-- The viewer uses source_page to navigate to the correct page in the PDF.

ALTER TABLE drawings ADD COLUMN IF NOT EXISTS source_page INTEGER;
