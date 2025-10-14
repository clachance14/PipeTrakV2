4. DATABASE SCHEMA DESIGN

4.1 Core Tables (13 tables)

──────────────────────────────────────────────────────────────────────────────
TABLE: organizations
──────────────────────────────────────────────────────────────────────────────
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
name                TEXT NOT NULL
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
is_active           BOOLEAN NOT NULL DEFAULT true

INDEXES:
- PRIMARY KEY (id)

RLS POLICIES:
- Users can view organizations they belong to
- Only admins can create/update organizations

──────────────────────────────────────────────────────────────────────────────
TABLE: projects
──────────────────────────────────────────────────────────────────────────────
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
name                TEXT NOT NULL
description         TEXT
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
is_archived         BOOLEAN NOT NULL DEFAULT false

INDEXES:
- PRIMARY KEY (id)
- INDEX idx_projects_org_id ON projects(org_id)
- INDEX idx_projects_is_archived ON projects(is_archived) WHERE NOT is_archived

RLS POLICIES:
- Users can view projects in their organization
- Only admins can create/archive projects

──────────────────────────────────────────────────────────────────────────────
TABLE: users
──────────────────────────────────────────────────────────────────────────────
id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
email               TEXT NOT NULL UNIQUE
full_name           TEXT
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
last_seen_at        TIMESTAMPTZ

INDEXES:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_users_email ON users(email)

Note: This table mirrors auth.users for application-specific user data.

──────────────────────────────────────────────────────────────────────────────
TABLE: user_organizations
──────────────────────────────────────────────────────────────────────────────
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
role                TEXT NOT NULL CHECK (role IN ('admin', 'member'))
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()

INDEXES:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_user_orgs_unique ON user_organizations(user_id, org_id)
- INDEX idx_user_orgs_org_id ON user_organizations(org_id)

──────────────────────────────────────────────────────────────────────────────
TABLE: user_capabilities
──────────────────────────────────────────────────────────────────────────────
id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
can_update_milestones   BOOLEAN NOT NULL DEFAULT false
can_import_weld_log     BOOLEAN NOT NULL DEFAULT false
can_manage_welders      BOOLEAN NOT NULL DEFAULT false
can_resolve_reviews     BOOLEAN NOT NULL DEFAULT false
can_view_dashboards     BOOLEAN NOT NULL DEFAULT false

INDEXES:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_user_caps_user_id ON user_capabilities(user_id)

──────────────────────────────────────────────────────────────────────────────
TABLE: drawings
──────────────────────────────────────────────────────────────────────────────
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
drawing_no_raw      TEXT NOT NULL
drawing_no_norm     TEXT NOT NULL
title               TEXT
rev                 TEXT
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
is_retired          BOOLEAN NOT NULL DEFAULT false
retire_reason       TEXT

INDEXES:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_drawings_project_norm ON drawings(project_id, drawing_no_norm)
  WHERE NOT is_retired
- INDEX idx_drawings_project_id ON drawings(project_id)
- INDEX idx_drawings_norm_trgm ON drawings USING gin(drawing_no_norm gin_trgm_ops)
  -- For similarity search using pg_trgm

RLS POLICIES:
- Users can view drawings in their org's projects
- Only admins/QC can retire drawings

──────────────────────────────────────────────────────────────────────────────
TABLE: areas
──────────────────────────────────────────────────────────────────────────────
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
name                TEXT NOT NULL
description         TEXT
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()

INDEXES:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_areas_project_name ON areas(project_id, name)

──────────────────────────────────────────────────────────────────────────────
TABLE: systems
──────────────────────────────────────────────────────────────────────────────
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
name                TEXT NOT NULL
description         TEXT
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()

INDEXES:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_systems_project_name ON systems(project_id, name)

──────────────────────────────────────────────────────────────────────────────
TABLE: test_packages
──────────────────────────────────────────────────────────────────────────────
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
name                TEXT NOT NULL
description         TEXT
target_date         DATE
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()

INDEXES:
- PRIMARY KEY (id)
- INDEX idx_packages_project_id ON test_packages(project_id)
- INDEX idx_packages_target_date ON test_packages(target_date)

──────────────────────────────────────────────────────────────────────────────
TABLE: progress_templates
──────────────────────────────────────────────────────────────────────────────
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
component_type      TEXT NOT NULL
version             INTEGER NOT NULL
workflow_type       TEXT NOT NULL CHECK (workflow_type IN ('discrete', 'quantity', 'hybrid'))
milestones_config   JSONB NOT NULL
-- Example: [{"name": "Receive", "weight": 5}, {"name": "Erect", "weight": 40}, ...]
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()

INDEXES:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_templates_type_version ON progress_templates(component_type, version)

SEED DATA (Sprint 1):
-- Spool template (version 1)
{
  "component_type": "spool",
  "version": 1,
  "workflow_type": "discrete",
  "milestones_config": [
    {"name": "Receive", "weight": 5, "order": 1},
    {"name": "Erect", "weight": 40, "order": 2},
    {"name": "Connect", "weight": 40, "order": 3},
    {"name": "Punch", "weight": 5, "order": 4},
    {"name": "Test", "weight": 5, "order": 5},
    {"name": "Restore", "weight": 5, "order": 6}
  ]
}

-- Field Weld template (version 1)
{
  "component_type": "field_weld",
  "version": 1,
  "workflow_type": "discrete",
  "milestones_config": [
    {"name": "Fit-Up", "weight": 10, "order": 1},
    {"name": "Weld Made", "weight": 60, "order": 2, "requires_welder": true},
    {"name": "Punch", "weight": 10, "order": 3},
    {"name": "Test", "weight": 15, "order": 4},
    {"name": "Restore", "weight": 5, "order": 5}
  ]
}

-- Support template (version 1)
{
  "component_type": "support",
  "version": 1,
  "workflow_type": "discrete",
  "milestones_config": [
    {"name": "Receive", "weight": 10, "order": 1},
    {"name": "Install", "weight": 60, "order": 2},
    {"name": "Punch", "weight": 10, "order": 3},
    {"name": "Test", "weight": 15, "order": 4},
    {"name": "Restore", "weight": 5, "order": 5}
  ]
}

-- Valve template (version 1)
{
  "component_type": "valve",
  "version": 1,
  "workflow_type": "discrete",
  "milestones_config": [
    {"name": "Receive", "weight": 10, "order": 1},
    {"name": "Install", "weight": 60, "order": 2},
    {"name": "Punch", "weight": 10, "order": 3},
    {"name": "Test", "weight": 15, "order": 4},
    {"name": "Restore", "weight": 5, "order": 5}
  ]
}

-- Fitting template (version 1)
{
  "component_type": "fitting",
  "version": 1,
  "workflow_type": "discrete",
  "milestones_config": [
    {"name": "Receive", "weight": 10, "order": 1},
    {"name": "Install", "weight": 60, "order": 2},
    {"name": "Punch", "weight": 10, "order": 3},
    {"name": "Test", "weight": 15, "order": 4},
    {"name": "Restore", "weight": 5, "order": 5}
  ]
}

-- Flange template (version 1)
{
  "component_type": "flange",
  "version": 1,
  "workflow_type": "discrete",
  "milestones_config": [
    {"name": "Receive", "weight": 10, "order": 1},
    {"name": "Install", "weight": 60, "order": 2},
    {"name": "Punch", "weight": 10, "order": 3},
    {"name": "Test", "weight": 15, "order": 4},
    {"name": "Restore", "weight": 5, "order": 5}
  ]
}

-- Instrument template (version 1)
{
  "component_type": "instrument",
  "version": 1,
  "workflow_type": "discrete",
  "milestones_config": [
    {"name": "Receive", "weight": 10, "order": 1},
    {"name": "Install", "weight": 60, "order": 2},
    {"name": "Punch", "weight": 10, "order": 3},
    {"name": "Test", "weight": 15, "order": 4},
    {"name": "Restore", "weight": 5, "order": 5}
  ]
}

-- Tubing template (version 1)
{
  "component_type": "tubing",
  "version": 1,
  "workflow_type": "discrete",
  "milestones_config": [
    {"name": "Receive", "weight": 10, "order": 1},
    {"name": "Install", "weight": 60, "order": 2},
    {"name": "Punch", "weight": 10, "order": 3},
    {"name": "Test", "weight": 15, "order": 4},
    {"name": "Restore", "weight": 5, "order": 5}
  ]
}

-- Hose template (version 1)
{
  "component_type": "hose",
  "version": 1,
  "workflow_type": "discrete",
  "milestones_config": [
    {"name": "Receive", "weight": 10, "order": 1},
    {"name": "Install", "weight": 60, "order": 2},
    {"name": "Punch", "weight": 10, "order": 3},
    {"name": "Test", "weight": 15, "order": 4},
    {"name": "Restore", "weight": 5, "order": 5}
  ]
}

-- Misc Component template (version 1)
{
  "component_type": "misc_component",
  "version": 1,
  "workflow_type": "discrete",
  "milestones_config": [
    {"name": "Receive", "weight": 10, "order": 1},
    {"name": "Install", "weight": 60, "order": 2},
    {"name": "Punch", "weight": 10, "order": 3},
    {"name": "Test", "weight": 15, "order": 4},
    {"name": "Restore", "weight": 5, "order": 5}
  ]
}

-- Threaded Pipe/Tubing template (version 1) - PENDING WEIGHT CONFIRMATION
{
  "component_type": "threaded_pipe",
  "version": 1,
  "workflow_type": "hybrid",
  "milestones_config": [
    {"name": "Fabricate", "weight": 16, "order": 1, "is_partial": true},
    {"name": "Install", "weight": 16, "order": 2, "is_partial": true},
    {"name": "Erect", "weight": 16, "order": 3, "is_partial": true},
    {"name": "Connect", "weight": 16, "order": 4, "is_partial": true},
    {"name": "Support", "weight": 16, "order": 5, "is_partial": true},
    {"name": "Punch", "weight": 5, "order": 6},
    {"name": "Test", "weight": 10, "order": 7},
    {"name": "Restore", "weight": 5, "order": 8}
  ]
}

──────────────────────────────────────────────────────────────────────────────
TABLE: components
──────────────────────────────────────────────────────────────────────────────
id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4()
project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
drawing_id              UUID REFERENCES drawings(id) ON DELETE SET NULL
component_type          TEXT NOT NULL
progress_template_id    UUID NOT NULL REFERENCES progress_templates(id)

-- Identity fields (type-specific, use JSONB or separate columns)
identity_key            JSONB NOT NULL
-- Examples:
-- Spool: {"spool_id": "SP-001"}
-- Field Weld: {"weld_number": "W-001"}
-- Support (Class-B): {"drawing_norm": "P-001", "commodity_code": "CS-2", "size": "2IN", "seq": 1}
-- Valve (Class-B): {"drawing_norm": "P-001", "commodity_code": "VGATU-CSCCFLR01D-002", "size": "3", "seq": 2}
-- Hose (Class-B): {"drawing_norm": "P-010", "commodity_code": "HOSE-CS-001", "size": "2", "seq": 1}
-- Misc Component (Class-B): {"drawing_norm": "P-050", "commodity_code": "MISC-123", "size": "N/A", "seq": 3}

-- Metadata fields
area_id                 UUID REFERENCES areas(id) ON DELETE SET NULL
system_id               UUID REFERENCES systems(id) ON DELETE SET NULL
test_package_id         UUID REFERENCES test_packages(id) ON DELETE SET NULL

-- Attributes (flexible JSONB for type-specific fields)
attributes              JSONB
-- Examples:
-- Spool: {"spec": "A106-B", "material": "CS", "size": "4IN"}
-- Support: {"size": "2IN", "commodity_code": "CS-2"}
-- Valve: {"size": "1.5IN", "rating": "150#", "commodity_code": "V-BALL"}
-- Field Weld (from weld log): {"weld_type": "BW", "welder_stencil": null, "date_welded": "2025-09-21"}
-- Optional dimensions captured pre-assignment: {"area_name": "B-68", "system_name": "HC-05", "test_package_name": null}

-- Progress tracking
current_milestones      JSONB NOT NULL DEFAULT '{}'
-- Example: {"Receive": true, "Erect": true, "Connect": false, ...}
-- For hybrid (partial %): {"Fabricate": 85, "Install": 60, "Punch": false, ...}

percent_complete        NUMERIC(5,2) NOT NULL DEFAULT 0.00
-- Cached ROC calculation (0.00 to 100.00)

-- Audit fields
created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
created_by              UUID REFERENCES users(id)
last_updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
last_updated_by         UUID REFERENCES users(id)

-- Soft delete
is_retired              BOOLEAN NOT NULL DEFAULT false
retire_reason           TEXT

INDEXES:
- PRIMARY KEY (id)
- INDEX idx_components_project_id ON components(project_id)
- INDEX idx_components_drawing_id ON components(drawing_id)
- INDEX idx_components_type ON components(component_type)
- INDEX idx_components_package_id ON components(test_package_id)
- INDEX idx_components_area_id ON components(area_id)
- INDEX idx_components_system_id ON components(system_id)
- INDEX idx_components_percent ON components(percent_complete)
- INDEX idx_components_updated ON components(last_updated_at DESC)
- GIN INDEX idx_components_identity ON components USING gin(identity_key)
- GIN INDEX idx_components_attrs ON components USING gin(attributes)
- UNIQUE INDEX idx_components_identity_unique ON components(project_id, component_type, identity_key)
  WHERE NOT is_retired

PERFORMANCE NOTE:
- With 1M components, expect ~500MB table size
- Indexes add ~200MB
- Query performance target: p90 <100ms for single component lookup

IDENTITY NOTES:
- Class-A components (spool, field_weld, instrument) rely on their normalized tags; duplicate rows trigger import errors unless an overwrite is explicitly approved.
- Class-B and quantity-based components (support, valve, fitting, flange, hose, tubing, misc_component) share the group key (drawing_norm, commodity_code, size). Imports expand quantity into deterministic sequence numbers (seq = 1..N) stored in identity_key to enable delta detection.
- Takeoff importer skips gaskets and preserves all raw column values inside attributes. Area/System/Test Package assignments are optional at import time and can be populated later in-app.

──────────────────────────────────────────────────────────────────────────────
TABLE: milestone_events
──────────────────────────────────────────────────────────────────────────────
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
component_id        UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE
milestone_name      TEXT NOT NULL
action              TEXT NOT NULL CHECK (action IN ('complete', 'rollback', 'update'))
value               NUMERIC(5,2)
-- For discrete: NULL (boolean toggle)
-- For partial %: 0.00-100.00
previous_value      NUMERIC(5,2)
user_id             UUID NOT NULL REFERENCES users(id)
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
metadata            JSONB
-- Example for Weld Made: {"welder_id": "uuid", "stencil": "JD42"}

INDEXES:
- PRIMARY KEY (id)
- INDEX idx_events_component_id ON milestone_events(component_id)
- INDEX idx_events_created_at ON milestone_events(created_at DESC)
- INDEX idx_events_user_id ON milestone_events(user_id)
- INDEX idx_events_milestone ON milestone_events(milestone_name)

PARTITIONING STRATEGY (Future):
- Partition by created_at (monthly) for projects >6 months old
- Keeps recent queries fast

──────────────────────────────────────────────────────────────────────────────
TABLE: welders
──────────────────────────────────────────────────────────────────────────────
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
name                TEXT NOT NULL
stencil             TEXT NOT NULL
stencil_norm        TEXT NOT NULL
-- Normalized: UPPER(TRIM(stencil)), validated against regex [A-Z0-9-]{2,12}
status              TEXT NOT NULL CHECK (status IN ('unverified', 'verified'))
                    DEFAULT 'unverified'
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
created_by          UUID REFERENCES users(id)
verified_at         TIMESTAMPTZ
verified_by         UUID REFERENCES users(id)

INDEXES:
- PRIMARY KEY (id)
- UNIQUE INDEX idx_welders_project_stencil ON welders(project_id, stencil_norm)
- INDEX idx_welders_status ON welders(status) WHERE status = 'unverified'

──────────────────────────────────────────────────────────────────────────────
TABLE: needs_review
──────────────────────────────────────────────────────────────────────────────
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
component_id        UUID REFERENCES components(id) ON DELETE CASCADE
type                TEXT NOT NULL CHECK (type IN (
                      'out_of_sequence',
                      'rollback',
                      'delta_quantity',
                      'drawing_change',
                      'similar_drawing',
                      'verify_welder'
                    ))
status              TEXT NOT NULL CHECK (status IN ('pending', 'resolved', 'ignored'))
                    DEFAULT 'pending'
payload             JSONB NOT NULL
-- Examples:
-- out_of_sequence: {"milestone": "Test", "prerequisite": "Install", "event_id": "uuid"}
-- delta_quantity: {"group_key": {...}, "old_count": 10, "new_count": 13, "delta": 3}
-- drawing_change: {"weld_number": "W-001", "old_drawing_id": "uuid", "new_drawing_id": "uuid"}
-- similar_drawing: {"new_drawing_norm": "P-001", "matches": [{"drawing_id": "uuid", "score": 0.92}, ...]}
-- verify_welder: {"welder_id": "uuid", "usage_count": 7}

created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
created_by          UUID REFERENCES users(id)
resolved_at         TIMESTAMPTZ
resolved_by         UUID REFERENCES users(id)
resolution_note     TEXT

INDEXES:
- PRIMARY KEY (id)
- INDEX idx_review_project_id ON needs_review(project_id)
- INDEX idx_review_component_id ON needs_review(component_id)
- INDEX idx_review_type ON needs_review(type)
- INDEX idx_review_status ON needs_review(status) WHERE status = 'pending'
- INDEX idx_review_created_at ON needs_review(created_at DESC)

──────────────────────────────────────────────────────────────────────────────
TABLE: audit_log
──────────────────────────────────────────────────────────────────────────────
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
user_id             UUID NOT NULL REFERENCES users(id)
action_type         TEXT NOT NULL
-- Examples: 'milestone_update', 'rollback', 'import', 'resolve_review', 'bulk_update'
entity_type         TEXT NOT NULL
-- Examples: 'component', 'drawing', 'welder', 'needs_review'
entity_id           UUID
old_value           JSONB
new_value           JSONB
reason              TEXT
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()

INDEXES:
- PRIMARY KEY (id)
- INDEX idx_audit_project_id ON audit_log(project_id)
- INDEX idx_audit_entity ON audit_log(entity_type, entity_id)
- INDEX idx_audit_user_id ON audit_log(user_id)
- INDEX idx_audit_created_at ON audit_log(created_at DESC)

RETENTION POLICY:
- Keep indefinitely while project is active
- Archive to cold storage when project is archived
- Never delete (regulatory compliance)

4.2 Materialized Views (Performance Optimization)

──────────────────────────────────────────────────────────────────────────────
MATERIALIZED VIEW: mv_package_readiness
──────────────────────────────────────────────────────────────────────────────
Purpose: Fast lookup for Test Package Readiness Dashboard

CREATE MATERIALIZED VIEW mv_package_readiness AS
SELECT
  tp.id AS package_id,
  tp.project_id,
  tp.name AS package_name,
  tp.target_date,
  COUNT(c.id) AS total_components,
  COUNT(c.id) FILTER (WHERE c.percent_complete = 100) AS completed_components,
  AVG(c.percent_complete) AS avg_percent_complete,
  COUNT(nr.id) FILTER (WHERE nr.status = 'pending') AS blocker_count,
  MAX(c.last_updated_at) AS last_activity_at
FROM test_packages tp
LEFT JOIN components c ON c.test_package_id = tp.id AND NOT c.is_retired
LEFT JOIN needs_review nr ON nr.component_id = c.id AND nr.status = 'pending'
GROUP BY tp.id, tp.project_id, tp.name, tp.target_date;

CREATE UNIQUE INDEX idx_mv_package_readiness_id ON mv_package_readiness(package_id);
CREATE INDEX idx_mv_package_readiness_project ON mv_package_readiness(project_id);

REFRESH STRATEGY:
- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_package_readiness every 60 seconds
- Trigger manual refresh after bulk update or import
- p95 query time: <50ms (vs ~500ms without materialized view)

──────────────────────────────────────────────────────────────────────────────
MATERIALIZED VIEW: mv_drawing_progress
──────────────────────────────────────────────────────────────────────────────
Purpose: Fast lookup for Drawing % Complete in tree navigation

CREATE MATERIALIZED VIEW mv_drawing_progress AS
SELECT
  d.id AS drawing_id,
  d.project_id,
  d.drawing_no_norm,
  COUNT(c.id) AS total_components,
  AVG(c.percent_complete) AS avg_percent_complete
FROM drawings d
LEFT JOIN components c ON c.drawing_id = d.id AND NOT c.is_retired
WHERE NOT d.is_retired
GROUP BY d.id, d.project_id, d.drawing_no_norm;

CREATE UNIQUE INDEX idx_mv_drawing_progress_id ON mv_drawing_progress(drawing_id);
CREATE INDEX idx_mv_drawing_progress_project ON mv_drawing_progress(project_id);

REFRESH STRATEGY: Same as mv_package_readiness (60s polling)

4.3 Stored Procedures (Business Logic)

──────────────────────────────────────────────────────────────────────────────
FUNCTION: calculate_component_percent(component_id UUID)
──────────────────────────────────────────────────────────────────────────────
Purpose: Calculate weighted ROC % based on completed milestones

CREATE OR REPLACE FUNCTION calculate_component_percent(p_component_id UUID)
RETURNS NUMERIC(5,2) AS $$
DECLARE
  v_template_id UUID;
  v_milestones_config JSONB;
  v_current_milestones JSONB;
  v_total_weight NUMERIC := 0;
BEGIN
  -- Get template and current milestones
  SELECT progress_template_id, current_milestones
  INTO v_template_id, v_current_milestones
  FROM components
  WHERE id = p_component_id;

  -- Get milestones config
  SELECT milestones_config INTO v_milestones_config
  FROM progress_templates
  WHERE id = v_template_id;

  -- Calculate weighted sum
  FOR milestone IN SELECT * FROM jsonb_array_elements(v_milestones_config) LOOP
    IF v_current_milestones->>(milestone->>'name') IS NOT NULL THEN
      IF (milestone->>'is_partial')::BOOLEAN = true THEN
        -- Partial % milestone (hybrid workflow)
        v_total_weight := v_total_weight +
          (milestone->>'weight')::NUMERIC *
          (v_current_milestones->>(milestone->>'name'))::NUMERIC / 100.0;
      ELSE
        -- Discrete milestone (boolean)
        IF (v_current_milestones->>(milestone->>'name'))::BOOLEAN = true THEN
          v_total_weight := v_total_weight + (milestone->>'weight')::NUMERIC;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN ROUND(v_total_weight, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

──────────────────────────────────────────────────────────────────────────────
TRIGGER: update_component_percent_on_milestone_change
──────────────────────────────────────────────────────────────────────────────
Purpose: Auto-update percent_complete when current_milestones changes

CREATE OR REPLACE FUNCTION trigger_update_component_percent()
RETURNS TRIGGER AS $$
BEGIN
  NEW.percent_complete := calculate_component_percent(NEW.id);
  NEW.last_updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_component_percent_on_milestone_change
BEFORE UPDATE OF current_milestones ON components
FOR EACH ROW
WHEN (OLD.current_milestones IS DISTINCT FROM NEW.current_milestones)
EXECUTE FUNCTION trigger_update_component_percent();

──────────────────────────────────────────────────────────────────────────────
FUNCTION: detect_similar_drawings(project_id UUID, drawing_no_norm TEXT)
──────────────────────────────────────────────────────────────────────────────
Purpose: Find similar drawing numbers using pg_trgm extension

CREATE OR REPLACE FUNCTION detect_similar_drawings(
  p_project_id UUID,
  p_drawing_no_norm TEXT,
  p_threshold NUMERIC DEFAULT 0.85
)
RETURNS TABLE(drawing_id UUID, drawing_no_norm TEXT, similarity_score NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.drawing_no_norm,
    similarity(d.drawing_no_norm, p_drawing_no_norm) AS score
  FROM drawings d
  WHERE d.project_id = p_project_id
    AND d.id != p_drawing_id
    AND NOT d.is_retired
    AND similarity(d.drawing_no_norm, p_drawing_no_norm) > p_threshold
  ORDER BY score DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql;

PREREQUISITES:
- CREATE EXTENSION IF NOT EXISTS pg_trgm;
- Index: idx_drawings_norm_trgm (already created above)

═══════════════════════════════════════════════════════════════════════════════

4.4 Import Pipeline Reference

TYPE NORMALIZATION
- Importers map spreadsheet TYPE strings to component_type using keyword matching (case-insensitive):
  - spool → contains "spool"
  - field_weld → weld log rows only (weld type stored in attributes)
  - threaded_pipe → contains "threaded" or "thread"
  - tubing → contains "tubing" or "tube"
  - hose → contains "hose"
  - support → contains "support", "shoe", "hanger", "guide", or "pipe stanchion"
  - valve → contains "valve", "vlv", "ball valve", "gate valve"
  - flange → contains "flange" or "flg"
  - fitting → contains "fitting", "elbow", "tee", "cap", "coupling"
  - instrument → contains "instrument", "psv", "trans", "gauge", "indicator"
  - misc_component → contains "misc", "component", or "item"
- Keywords are evaluated in the order listed; the first match is used.
- Rows containing "gasket" are ignored (out of MVP scope).

COLUMN HANDLING
- Required: drawing, component_type, identity elements, quantity (where applicable).
- Drawings are normalized (upper case, trimmed, collapsed separators, numeric de-zero) and created during the takeoff import.
- Area/System/Test Package are optional during import; unresolved values are stored in attributes (`area_name`, `system_name`, `test_package_name`) for later assignment.
- Every incoming column is persisted: structured fields map to dedicated columns where needed, all remaining values land in attributes JSON with descriptive keys.

VALIDATION & APPROVAL FLOW
- Single run validates all rows before writing. Duplicate Class-A identities or quantity deltas halt the import and surface an error report.
- Overwrites require explicit approval and, when granted, will either update existing Class-A components or queue Needs Review entries before adjusting Class-B instance counts.
- Weld log imports re-use the same validation rules and ensure drawings already exist from the takeoff pass.

WRITE STEPS
1. Ingest + normalize rows (type keywords, drawing normalization, JSON payload assembly).
2. Build identity_key per row and pre-compute sequence expansion for Class-B types.
3. Validate against existing components; collect duplicate/delta findings.
4. On clean validation (or approved override), insert/update components inside a transaction, create welders as needed, and enqueue Needs Review items for any pending deltas.
5. Refresh dependent materialized views when large batches complete.
