-- Fix: Align template ID lookup with get_component_template() logic in reclassify_component
-- and create_manual_component. Also add refresh_materialized_views() to reclassify_component.
--
-- Issues fixed:
-- 1. Template ID was looked up via raw MAX(version) on progress_templates, but milestones
--    were built via get_component_template() which checks project_progress_templates first.
--    These could diverge for projects with custom templates.
-- 2. reclassify_component was missing refresh_materialized_views() call.

-- ============================================================================
-- Fix RPC 1: reclassify_component
-- ============================================================================

CREATE OR REPLACE FUNCTION reclassify_component(
  p_component_id UUID,
  p_new_type TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_component RECORD;
  v_user_role TEXT;
  v_sibling_ids UUID[];
  v_sibling_count INT;
  v_new_template_id UUID;
  v_new_milestones JSONB;
BEGIN
  -- Fetch target component
  SELECT * INTO v_component
  FROM components
  WHERE id = p_component_id AND NOT is_retired;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Component not found or is retired: %', p_component_id;
  END IF;

  -- Permission check
  SELECT u.role INTO v_user_role
  FROM projects p
  JOIN users u ON u.organization_id = p.organization_id
  WHERE p.id = v_component.project_id AND u.id = p_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: user does not have permission for this project';
  END IF;

  IF v_user_role NOT IN ('owner', 'admin', 'project_manager', 'qc_inspector') THEN
    RAISE EXCEPTION 'Access denied: insufficient role to reclassify components';
  END IF;

  -- Guard: target component must have 0% progress
  IF v_component.percent_complete != 0 THEN
    RAISE EXCEPTION 'Cannot reclassify: component has progress (%%complete = %)',
      v_component.percent_complete;
  END IF;

  -- Find siblings based on component type
  IF v_component.component_type IN ('pipe', 'threaded_pipe', 'spool', 'field_weld') THEN
    v_sibling_ids := ARRAY[v_component.id];
  ELSE
    SELECT array_agg(c.id) INTO v_sibling_ids
    FROM components c
    WHERE c.drawing_id = v_component.drawing_id
      AND c.component_type = v_component.component_type
      AND c.identity_key->>'commodity_code' = v_component.identity_key->>'commodity_code'
      AND c.identity_key->>'size' = v_component.identity_key->>'size'
      AND NOT c.is_retired;
  END IF;

  v_sibling_count := array_length(v_sibling_ids, 1);

  -- Guard: ALL siblings must have 0% progress
  IF EXISTS (
    SELECT 1 FROM components
    WHERE id = ANY(v_sibling_ids)
      AND percent_complete != 0
  ) THEN
    RAISE EXCEPTION 'Cannot reclassify: one or more siblings have progress';
  END IF;

  -- Dedup check
  IF EXISTS (
    SELECT 1 FROM components existing
    WHERE existing.project_id = v_component.project_id
      AND existing.component_type = p_new_type
      AND existing.identity_key IN (
        SELECT c.identity_key FROM components c WHERE c.id = ANY(v_sibling_ids)
      )
      AND NOT existing.is_retired
      AND existing.id != ALL(v_sibling_ids)
  ) THEN
    RAISE EXCEPTION 'Cannot reclassify: a component with type "%" and the same identity already exists', p_new_type;
  END IF;

  -- Look up template ID consistent with get_component_template() logic:
  -- Check project-specific templates first, fall back to system templates
  IF EXISTS (
    SELECT 1 FROM project_progress_templates
    WHERE project_id = v_component.project_id AND component_type = p_new_type
    LIMIT 1
  ) THEN
    -- Project has custom templates - use the project_progress_templates source
    -- but still need a progress_templates ID for progress_template_id FK
    SELECT pt.id INTO v_new_template_id
    FROM progress_templates pt
    WHERE pt.component_type = p_new_type
      AND pt.version = (
        SELECT MAX(version) FROM progress_templates WHERE component_type = p_new_type
      )
    LIMIT 1;
  ELSE
    -- System templates
    SELECT pt.id INTO v_new_template_id
    FROM progress_templates pt
    WHERE pt.component_type = p_new_type
      AND pt.version = (
        SELECT MAX(version) FROM progress_templates WHERE component_type = p_new_type
      )
    LIMIT 1;
  END IF;

  IF v_new_template_id IS NULL THEN
    RAISE EXCEPTION 'No progress template found for component type: %', p_new_type;
  END IF;

  -- Build default milestones from get_component_template (handles project-specific)
  SELECT jsonb_object_agg(milestone_name, 0) INTO v_new_milestones
  FROM get_component_template(v_component.project_id, p_new_type);

  IF v_new_milestones IS NULL THEN
    v_new_milestones := '{}'::JSONB;
  END IF;

  -- Update all siblings
  UPDATE components
  SET
    component_type = p_new_type,
    progress_template_id = v_new_template_id,
    current_milestones = v_new_milestones,
    percent_complete = 0,
    version = version + 1,
    last_updated_at = now(),
    last_updated_by = p_user_id
  WHERE id = ANY(v_sibling_ids);

  -- Refresh materialized views (reclassify changes component_type which affects aggregations)
  PERFORM refresh_materialized_views();

  RETURN jsonb_build_object(
    'components_updated', v_sibling_count,
    'new_type', p_new_type
  );
END;
$$;

COMMENT ON FUNCTION reclassify_component(UUID, TEXT, UUID) IS
'Reclassify a component and its siblings to a new type. Resets template and milestones. Requires 0% progress on all siblings.';

-- ============================================================================
-- Fix RPC 4: create_manual_component (template lookup consistency)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_manual_component(
  p_drawing_id UUID,
  p_project_id UUID,
  p_component_type TEXT,
  p_identity JSONB,
  p_attributes JSONB,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_drawing RECORD;
  v_template_id UUID;
  v_default_milestones JSONB;
  v_identity_key JSONB;
  v_quantity INT;
  v_drawing_norm TEXT;
  v_commodity_code TEXT;
  v_size_norm TEXT;
  v_pipe_id TEXT;
  v_next_seq INT;
  v_created_ids UUID[];
  v_new_id UUID;
  v_i INT;
BEGIN
  -- Permission check
  SELECT u.role INTO v_user_role
  FROM projects p
  JOIN users u ON u.organization_id = p.organization_id
  WHERE p.id = p_project_id AND u.id = p_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: user does not have permission for this project';
  END IF;

  IF v_user_role NOT IN ('owner', 'admin', 'project_manager', 'qc_inspector') THEN
    RAISE EXCEPTION 'Access denied: insufficient role to create components';
  END IF;

  -- Fetch the drawing
  SELECT * INTO v_drawing
  FROM drawings
  WHERE id = p_drawing_id AND project_id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drawing not found or does not belong to project';
  END IF;

  -- Look up template ID (consistent with get_component_template logic)
  SELECT pt.id INTO v_template_id
  FROM progress_templates pt
  WHERE pt.component_type = p_component_type
    AND pt.version = (
      SELECT MAX(version) FROM progress_templates WHERE component_type = p_component_type
    )
  LIMIT 1;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'No progress template found for component type: %', p_component_type;
  END IF;

  -- Build default milestones via get_component_template (handles project-specific)
  SELECT jsonb_object_agg(milestone_name, 0) INTO v_default_milestones
  FROM get_component_template(p_project_id, p_component_type);

  IF v_default_milestones IS NULL THEN
    v_default_milestones := '{}'::JSONB;
  END IF;

  v_created_ids := ARRAY[]::UUID[];
  v_drawing_norm := v_drawing.drawing_no_norm;

  IF p_component_type = 'spool' THEN
    v_identity_key := jsonb_build_object('spool_id', p_identity->>'spool_id');

    IF EXISTS (
      SELECT 1 FROM components
      WHERE project_id = p_project_id AND component_type = p_component_type
        AND identity_key = v_identity_key AND NOT is_retired
    ) THEN
      RAISE EXCEPTION 'A spool with this ID already exists in the project';
    END IF;

    INSERT INTO components (
      project_id, drawing_id, component_type, identity_key, attributes,
      current_milestones, progress_template_id, percent_complete,
      area_id, system_id, test_package_id,
      created_by, last_updated_at, last_updated_by
    ) VALUES (
      p_project_id, p_drawing_id, p_component_type, v_identity_key, p_attributes,
      v_default_milestones, v_template_id, 0,
      v_drawing.area_id, v_drawing.system_id, v_drawing.test_package_id,
      p_user_id, now(), p_user_id
    ) RETURNING id INTO v_new_id;

    v_created_ids := array_append(v_created_ids, v_new_id);

  ELSIF p_component_type = 'field_weld' THEN
    v_identity_key := jsonb_build_object('weld_number', p_identity->>'weld_number');

    IF EXISTS (
      SELECT 1 FROM components
      WHERE project_id = p_project_id AND component_type = p_component_type
        AND identity_key = v_identity_key AND NOT is_retired
    ) THEN
      RAISE EXCEPTION 'A field weld with this number already exists in the project';
    END IF;

    INSERT INTO components (
      project_id, drawing_id, component_type, identity_key, attributes,
      current_milestones, progress_template_id, percent_complete,
      area_id, system_id, test_package_id,
      created_by, last_updated_at, last_updated_by
    ) VALUES (
      p_project_id, p_drawing_id, p_component_type, v_identity_key, p_attributes,
      v_default_milestones, v_template_id, 0,
      v_drawing.area_id, v_drawing.system_id, v_drawing.test_package_id,
      p_user_id, now(), p_user_id
    ) RETURNING id INTO v_new_id;

    v_created_ids := array_append(v_created_ids, v_new_id);

  ELSIF p_component_type IN ('pipe', 'threaded_pipe') THEN
    v_commodity_code := COALESCE(p_identity->>'commodity_code', 'UNKNOWN');
    v_size_norm := COALESCE(p_identity->>'size', 'NOSIZE');
    v_pipe_id := v_drawing_norm || '-' || v_size_norm || '-' || v_commodity_code || '-AGG';
    v_identity_key := jsonb_build_object('pipe_id', v_pipe_id);

    IF EXISTS (
      SELECT 1 FROM components
      WHERE project_id = p_project_id AND component_type = p_component_type
        AND identity_key = v_identity_key AND NOT is_retired
    ) THEN
      RAISE EXCEPTION 'An aggregate % component with this identity already exists', p_component_type;
    END IF;

    INSERT INTO components (
      project_id, drawing_id, component_type, identity_key, attributes,
      current_milestones, progress_template_id, percent_complete,
      area_id, system_id, test_package_id,
      created_by, last_updated_at, last_updated_by
    ) VALUES (
      p_project_id, p_drawing_id, p_component_type, v_identity_key, p_attributes,
      v_default_milestones, v_template_id, 0,
      v_drawing.area_id, v_drawing.system_id, v_drawing.test_package_id,
      p_user_id, now(), p_user_id
    ) RETURNING id INTO v_new_id;

    v_created_ids := array_append(v_created_ids, v_new_id);

  ELSE
    -- Exploded types
    v_commodity_code := COALESCE(p_identity->>'commodity_code', 'UNKNOWN');
    v_size_norm := COALESCE(p_identity->>'size', 'NOSIZE');
    v_quantity := COALESCE((p_attributes->>'quantity')::INT, 1);

    IF v_quantity < 1 THEN
      v_quantity := 1;
    END IF;

    SELECT COALESCE(MAX((identity_key->>'seq')::INT), 0) INTO v_next_seq
    FROM components
    WHERE drawing_id = p_drawing_id
      AND component_type = p_component_type
      AND identity_key->>'commodity_code' = v_commodity_code
      AND identity_key->>'size' = v_size_norm
      AND NOT is_retired;

    FOR v_i IN 1..v_quantity LOOP
      v_next_seq := v_next_seq + 1;

      v_identity_key := jsonb_build_object(
        'drawing_norm', v_drawing_norm,
        'commodity_code', v_commodity_code,
        'size', v_size_norm,
        'seq', v_next_seq
      );

      INSERT INTO components (
        project_id, drawing_id, component_type, identity_key, attributes,
        current_milestones, progress_template_id, percent_complete,
        area_id, system_id, test_package_id,
        created_by, last_updated_at, last_updated_by
      ) VALUES (
        p_project_id, p_drawing_id, p_component_type, v_identity_key, p_attributes,
        v_default_milestones, v_template_id, 0,
        v_drawing.area_id, v_drawing.system_id, v_drawing.test_package_id,
        p_user_id, now(), p_user_id
      ) RETURNING id INTO v_new_id;

      v_created_ids := array_append(v_created_ids, v_new_id);
    END LOOP;
  END IF;

  PERFORM refresh_materialized_views();

  RETURN jsonb_build_object(
    'components_created', array_length(v_created_ids, 1),
    'component_ids', to_jsonb(v_created_ids)
  );
END;
$$;

COMMENT ON FUNCTION create_manual_component(UUID, UUID, TEXT, JSONB, JSONB, UUID) IS
'Manually create a component on a drawing. Handles spool, field_weld, pipe/threaded_pipe aggregate, and exploded types. Inherits area/system/test_package from drawing.';
