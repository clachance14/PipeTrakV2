# Stored Procedures Contract

**Feature**: 005-sprint-1-core
**Date**: 2025-10-15

## 1. calculate_component_percent(component_id UUID)

**Purpose**: Calculate weighted ROC % based on completed milestones (FR-011, FR-012).

**Signature**:
```sql
CREATE OR REPLACE FUNCTION calculate_component_percent(p_component_id UUID)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql IMMUTABLE;
```

**Logic**:
1. SELECT progress_template_id, current_milestones FROM components WHERE id = p_component_id
2. SELECT milestones_config FROM progress_templates WHERE id = progress_template_id
3. FOR each milestone IN milestones_config:
   - IF is_partial = true: total += weight * (current_milestones[name] / 100.0)
   - ELSE IF current_milestones[name] = true: total += weight
4. RETURN ROUND(total, 2)

**Test Cases**:

```typescript
describe('calculate_component_percent', () => {
  it('returns 0.00 when no milestones complete', async () => {
    const componentId = await createComponent({
      component_type: 'spool',
      current_milestones: {}
    });
    const result = await supabase.rpc('calculate_component_percent', { p_component_id: componentId });
    expect(result.data).toBe(0.00);
  });

  it('returns 45.00 for spool with Receive (5%) + Erect (40%) complete', async () => {
    const componentId = await createComponent({
      component_type: 'spool',
      current_milestones: { "Receive": true, "Erect": true, "Connect": false }
    });
    const result = await supabase.rpc('calculate_component_percent', { p_component_id: componentId });
    expect(result.data).toBe(45.00);
  });

  it('returns 100.00 when all milestones complete', async () => {
    const componentId = await createComponent({
      component_type: 'spool',
      current_milestones: { "Receive": true, "Erect": true, "Connect": true, "Punch": true, "Test": true, "Restore": true }
    });
    const result = await supabase.rpc('calculate_component_percent', { p_component_id: componentId });
    expect(result.data).toBe(100.00);
  });

  it('calculates partial % for hybrid workflow (threaded pipe)', async () => {
    const componentId = await createComponent({
      component_type: 'threaded_pipe',
      current_milestones: { "Fabricate": 75.00, "Install": 0, "Erect": 0 }
    });
    // 16% * 0.75 = 12.00%
    const result = await supabase.rpc('calculate_component_percent', { p_component_id: componentId });
    expect(result.data).toBe(12.00);
  });
});
```

---

## 2. detect_similar_drawings(project_id UUID, drawing_no_norm TEXT, threshold NUMERIC)

**Purpose**: Find similar drawing numbers using pg_trgm trigram similarity (FR-037 to FR-040).

**Signature**:
```sql
CREATE OR REPLACE FUNCTION detect_similar_drawings(
  p_project_id UUID,
  p_drawing_no_norm TEXT,
  p_threshold NUMERIC DEFAULT 0.85
)
RETURNS TABLE(drawing_id UUID, drawing_no_norm TEXT, similarity_score NUMERIC)
LANGUAGE plpgsql;
```

**Logic**:
1. SELECT id, drawing_no_norm, similarity(drawing_no_norm, p_drawing_no_norm) AS score
2. FROM drawings
3. WHERE project_id = p_project_id AND NOT is_retired
4. AND similarity(drawing_no_norm, p_drawing_no_norm) > p_threshold
5. ORDER BY score DESC LIMIT 3

**Prerequisites**:
- `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- GIN index on drawing_no_norm: `CREATE INDEX idx_drawings_norm_trgm ON drawings USING gin(drawing_no_norm gin_trgm_ops);`

**Test Cases**:

```typescript
describe('detect_similar_drawings', () => {
  it('finds P-0001 when searching for P-001 (92% similarity)', async () => {
    const projectId = 'test-project';
    await createDrawing({ project_id: projectId, drawing_no_norm: 'P-0001' });
    await createDrawing({ project_id: projectId, drawing_no_norm: 'P-0002' });

    const result = await supabase.rpc('detect_similar_drawings', {
      p_project_id: projectId,
      p_drawing_no_norm: 'P-001',
      p_threshold: 0.85
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].drawing_no_norm).toBe('P-0001');
    expect(result.data[0].similarity_score).toBeGreaterThan(0.85);
  });

  it('excludes retired drawings from results', async () => {
    const projectId = 'test-project';
    await createDrawing({ project_id: projectId, drawing_no_norm: 'P-0001', is_retired: true });
    await createDrawing({ project_id: projectId, drawing_no_norm: 'P-001', is_retired: false });

    const result = await supabase.rpc('detect_similar_drawings', {
      p_project_id: projectId,
      p_drawing_no_norm: 'P-001',
      p_threshold: 0.85
    });

    // Should not include the retired drawing P-0001
    const retiredDrawing = result.data?.find(d => d.drawing_no_norm === 'P-0001');
    expect(retiredDrawing).toBeUndefined();
  });

  it('returns max 3 results ordered by similarity score', async () => {
    const projectId = 'test-project';
    await createDrawing({ project_id: projectId, drawing_no_norm: 'P-0001' }); // High similarity
    await createDrawing({ project_id: projectId, drawing_no_norm: 'P-0010' }); // Medium similarity
    await createDrawing({ project_id: projectId, drawing_no_norm: 'P-1000' }); // Lower similarity
    await createDrawing({ project_id: projectId, drawing_no_norm: 'X-9999' }); // No similarity (below threshold)

    const result = await supabase.rpc('detect_similar_drawings', {
      p_project_id: projectId,
      p_drawing_no_norm: 'P-001',
      p_threshold: 0.85
    });

    expect(result.data.length).toBeLessThanOrEqual(3);
    // Verify descending order
    for (let i = 1; i < result.data.length; i++) {
      expect(result.data[i-1].similarity_score).toBeGreaterThanOrEqual(result.data[i].similarity_score);
    }
  });
});
```

---

## 3. validate_component_identity_key(component_type TEXT, identity_key JSONB)

**Purpose**: Validate identity_key structure matches component type schema (FR-041).

**Signature**:
```sql
CREATE OR REPLACE FUNCTION validate_component_identity_key(
  p_component_type TEXT,
  p_identity_key JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE;
```

**Logic**: CASE statement validates required keys per component type (see research.md section 3).

**Test Cases**:

```typescript
describe('validate_component_identity_key', () => {
  it('accepts valid spool identity_key', async () => {
    const result = await supabase.rpc('validate_component_identity_key', {
      p_component_type: 'spool',
      p_identity_key: { spool_id: 'SP-001' }
    });
    expect(result.data).toBe(true);
  });

  it('rejects spool with field_weld identity_key', async () => {
    const result = await supabase.rpc('validate_component_identity_key', {
      p_component_type: 'spool',
      p_identity_key: { weld_number: 'W-001' }
    });
    expect(result.data).toBe(false);
  });

  it('accepts valid support identity_key with all required fields', async () => {
    const result = await supabase.rpc('validate_component_identity_key', {
      p_component_type: 'support',
      p_identity_key: { drawing_norm: 'P-001', commodity_code: 'CS-2', size: '2IN', seq: 1 }
    });
    expect(result.data).toBe(true);
  });
});
```

---

## 4. validate_milestone_weights(milestones_config JSONB)

**Purpose**: Ensure milestone weights total exactly 100% (FR-042).

**Signature**:
```sql
CREATE OR REPLACE FUNCTION validate_milestone_weights(p_milestones_config JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE;
```

**Logic**: Loop through milestones, sum weights, return true if total = 100.00.

**Test Cases**:

```typescript
describe('validate_milestone_weights', () => {
  it('returns true for weights totaling 100%', async () => {
    const config = [
      { name: 'Receive', weight: 5 },
      { name: 'Erect', weight: 40 },
      { name: 'Connect', weight: 40 },
      { name: 'Punch', weight: 5 },
      { name: 'Test', weight: 5 },
      { name: 'Restore', weight: 5 }
    ];
    const result = await supabase.rpc('validate_milestone_weights', { p_milestones_config: config });
    expect(result.data).toBe(true);
  });

  it('returns false for weights totaling 97%', async () => {
    const config = [
      { name: 'Receive', weight: 5 },
      { name: 'Erect', weight: 40 },
      { name: 'Connect', weight: 40 },
      { name: 'Punch', weight: 5 },
      { name: 'Test', weight: 5 },
      { name: 'Restore', weight: 2 }  // Wrong: should be 5
    ];
    const result = await supabase.rpc('validate_milestone_weights', { p_milestones_config: config });
    expect(result.data).toBe(false);
  });
});
```

---

## 5. get_weld_repair_history(parent_weld_id UUID)

**Purpose**: Retrieve complete repair chain for a field weld (original + all repairs) (FR-056).

**Signature**:
```sql
CREATE OR REPLACE FUNCTION get_weld_repair_history(p_parent_weld_id UUID)
RETURNS TABLE(
  id UUID,
  weld_id_number NUMERIC(10,2),
  repair_sequence INTEGER,
  welder_stencil TEXT,
  date_welded DATE,
  comments TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql;
```

**Logic**:
1. Find the root weld (parent_weld_id IS NULL) by traversing up the repair chain if needed
2. Return root weld + all descendants (repairs) ordered by weld_id_number ASC
3. Uses recursive CTE to handle multi-level repairs (42 → 42.1 → 42.2 → 42.2.1)

**Implementation**:
```sql
WITH RECURSIVE repair_chain AS (
  -- Anchor: Get the root weld (no parent)
  SELECT * FROM field_weld_inspections
  WHERE id = (
    SELECT COALESCE(
      (SELECT id FROM field_weld_inspections WHERE id = p_parent_weld_id AND parent_weld_id IS NULL),
      (SELECT parent_weld_id FROM field_weld_inspections WHERE id = p_parent_weld_id)
    )
  )

  UNION ALL

  -- Recursive: Get all children (repairs)
  SELECT fwi.* FROM field_weld_inspections fwi
  INNER JOIN repair_chain rc ON fwi.parent_weld_id = rc.id
)
SELECT id, weld_id_number, repair_sequence, welder_stencil, date_welded, comments, created_at
FROM repair_chain
ORDER BY weld_id_number ASC;
```

**Test Cases**:

```typescript
describe('get_weld_repair_history', () => {
  it('returns only original weld when no repairs exist', async () => {
    const weldId = await createWeldInspection({
      weld_id_number: 42.0,
      parent_weld_id: null,
      repair_sequence: 0
    });

    const result = await supabase.rpc('get_weld_repair_history', { p_parent_weld_id: weldId });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].weld_id_number).toBe(42.0);
    expect(result.data[0].repair_sequence).toBe(0);
  });

  it('returns original weld + repairs in correct order', async () => {
    const projectId = 'test-project';

    // Create original weld
    const originalWeld = await createWeldInspection({
      project_id: projectId,
      weld_id_number: 42.0,
      parent_weld_id: null,
      repair_sequence: 0,
      welder_stencil: 'JD42',
      date_welded: '2025-01-01'
    });

    // Create first repair
    const repair1 = await createWeldInspection({
      project_id: projectId,
      weld_id_number: 42.1,
      parent_weld_id: originalWeld.id,
      repair_sequence: 1,
      welder_stencil: 'AB99',
      date_welded: '2025-01-05'
    });

    // Create second repair
    const repair2 = await createWeldInspection({
      project_id: projectId,
      weld_id_number: 42.2,
      parent_weld_id: originalWeld.id,
      repair_sequence: 2,
      welder_stencil: 'CD77',
      date_welded: '2025-01-10'
    });

    const result = await supabase.rpc('get_weld_repair_history', { p_parent_weld_id: originalWeld.id });

    expect(result.data).toHaveLength(3);
    expect(result.data[0].weld_id_number).toBe(42.0);
    expect(result.data[0].welder_stencil).toBe('JD42');
    expect(result.data[1].weld_id_number).toBe(42.1);
    expect(result.data[1].welder_stencil).toBe('AB99');
    expect(result.data[2].weld_id_number).toBe(42.2);
    expect(result.data[2].welder_stencil).toBe('CD77');
  });

  it('works when called with repair ID (traverses to root)', async () => {
    const projectId = 'test-project';

    const originalWeld = await createWeldInspection({
      project_id: projectId,
      weld_id_number: 42.0,
      parent_weld_id: null,
      repair_sequence: 0
    });

    const repair1 = await createWeldInspection({
      project_id: projectId,
      weld_id_number: 42.1,
      parent_weld_id: originalWeld.id,
      repair_sequence: 1
    });

    // Call with repair ID, should still return full chain
    const result = await supabase.rpc('get_weld_repair_history', { p_parent_weld_id: repair1.id });

    expect(result.data).toHaveLength(2);
    expect(result.data[0].weld_id_number).toBe(42.0);
    expect(result.data[1].weld_id_number).toBe(42.1);
  });

  it('handles nested repairs (42 → 42.1 → 42.1.1)', async () => {
    const projectId = 'test-project';

    const originalWeld = await createWeldInspection({
      project_id: projectId,
      weld_id_number: 42.0,
      parent_weld_id: null,
      repair_sequence: 0
    });

    const repair1 = await createWeldInspection({
      project_id: projectId,
      weld_id_number: 42.1,
      parent_weld_id: originalWeld.id,
      repair_sequence: 1
    });

    const nestedRepair = await createWeldInspection({
      project_id: projectId,
      weld_id_number: 42.11,
      parent_weld_id: repair1.id,
      repair_sequence: 1
    });

    const result = await supabase.rpc('get_weld_repair_history', { p_parent_weld_id: originalWeld.id });

    expect(result.data).toHaveLength(3);
    expect(result.data.map(r => r.weld_id_number)).toEqual([42.0, 42.1, 42.11]);
  });
});
```

---

## Performance Requirements

- **calculate_component_percent**: <10ms (single component lookup)
- **detect_similar_drawings**: <100ms with 10k drawings (via GIN index)
- **validate_component_identity_key**: <1ms (pure logic, no DB queries)
- **validate_milestone_weights**: <5ms (JSON loop over ~10 milestones)
- **get_weld_repair_history**: <20ms (recursive CTE, typically <5 levels deep)

---

## Error Handling

All functions use `RETURNS NULL ON NULL INPUT` behavior (implicit). If any input is NULL:
- **calculate_component_percent**: Returns NULL (component not found)
- **detect_similar_drawings**: Returns empty table (no results)
- **validate_component_identity_key**: Returns false (validation failed)
- **validate_milestone_weights**: Returns false (validation failed)
- **get_weld_repair_history**: Returns empty table (weld not found)

---

## Next Steps

1. Implement stored procedures in migration `00009_sprint1_core_tables.sql`
2. Write contract tests in `tests/contract/stored-procedures.test.ts` (must fail initially)
3. Validate performance with EXPLAIN ANALYZE after implementation
