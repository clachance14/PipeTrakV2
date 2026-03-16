-- Create drawing_bom_items and ai_usage_log tables for AI drawing import feature

-- ============================================================================
-- Table 1: drawing_bom_items
-- Stores bill of materials items extracted from drawings (via AI or manual entry)
-- ============================================================================

CREATE TABLE drawing_bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  classification TEXT NOT NULL,
  section TEXT NOT NULL,
  description TEXT,
  size TEXT,
  size_2 TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  uom TEXT,
  spec TEXT,
  material_grade TEXT,
  schedule TEXT,
  schedule_2 TEXT,
  rating TEXT,
  commodity_code TEXT,
  end_connection TEXT,
  item_number INTEGER,
  needs_review BOOLEAN DEFAULT false,
  review_reason TEXT,
  is_tracked BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for drawing_bom_items
CREATE INDEX idx_drawing_bom_items_drawing_id ON drawing_bom_items(drawing_id);
CREATE INDEX idx_drawing_bom_items_project_id ON drawing_bom_items(project_id);

-- RLS for drawing_bom_items
ALTER TABLE drawing_bom_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view BOM items for their projects"
ON drawing_bom_items
FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert BOM items for their projects"
ON drawing_bom_items
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update BOM items for their projects"
ON drawing_bom_items
FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- ============================================================================
-- Table 2: ai_usage_log
-- Tracks AI API usage (tokens, costs) per project/drawing for billing visibility
-- ============================================================================

CREATE TABLE ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_id UUID REFERENCES drawings(id) ON DELETE SET NULL,
  operation TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_cost DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for ai_usage_log
CREATE INDEX idx_ai_usage_log_project_id ON ai_usage_log(project_id);

-- RLS for ai_usage_log
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and PMs can view AI usage logs"
ON ai_usage_log
FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'admin', 'project_manager')
);
