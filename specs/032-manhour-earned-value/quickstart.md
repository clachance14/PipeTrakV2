# Quickstart: Manhour Earned Value Tracking

**Feature**: 032-manhour-earned-value
**Date**: 2025-12-04

## Overview

This guide covers implementing the manhour earned value tracking feature for PipeTrak V2. The feature adds:
1. Project-level manhour budgeting
2. Auto-distribution to components based on size
3. Automatic earned value updates on milestone changes
4. Aggregated reporting by dimension

---

## Implementation Order

Follow this order to ensure dependencies are met:

### Phase 1: Database Foundation
1. Create tables migration (project_manhour_budgets, manhour_buckets, component_manhours)
2. Create RLS policies migration
3. Create views migration (vw_manhour_by_*)
4. Create RPC functions migration

### Phase 2: Business Logic
5. Implement SIZE parsing utility (`src/lib/manhour/parse-size.ts`)
6. Implement weight calculation utility (`src/lib/manhour/calculate-weight.ts`)
7. Add permission helper (`src/lib/permissions/manhour-permissions.ts`)

### Phase 3: Data Layer
8. Implement `useManhourBudget` hook
9. Implement `useProjectManhours` hook
10. Implement `useComponentManhours` hook
11. Implement `useManhourDistribution` hook

### Phase 4: UI Components
12. Create `ManhourBudgetPage` settings tab
13. Create `BudgetCreateForm` component
14. Create `ManhourSummaryWidget` dashboard component
15. Integrate manhours into `ComponentDetailView`
16. Integrate manhours into Reports page

### Phase 5: Integration
17. Modify `update_component_milestone()` RPC to trigger earned value updates
18. Add export column handling

---

## Key Patterns

### SIZE Parsing

```typescript
// src/lib/manhour/parse-size.ts

export interface ParsedSize {
  diameter: number | null;
  isReducer: boolean;
  secondDiameter?: number;
  raw: string;
}

export function parseSize(sizeString: string): ParsedSize {
  if (!sizeString || sizeString === 'NOSIZE') {
    return { diameter: null, isReducer: false, raw: sizeString };
  }

  // Handle reducers: "2X4", "1X2"
  const reducerMatch = sizeString.match(/^(\d+(?:\/\d+)?)[Xx](\d+(?:\/\d+)?)$/);
  if (reducerMatch) {
    return {
      diameter: parseFraction(reducerMatch[1]),
      isReducer: true,
      secondDiameter: parseFraction(reducerMatch[2]),
      raw: sizeString
    };
  }

  // Handle fractions: "1/2", "3/4"
  return {
    diameter: parseFraction(sizeString),
    isReducer: false,
    raw: sizeString
  };
}

function parseFraction(value: string): number | null {
  // Handle "HALF" → 0.5
  if (value.toUpperCase() === 'HALF') return 0.5;

  // Handle fractions: "1/2" → 0.5
  const fractionMatch = value.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
  }

  // Handle integers: "2" → 2.0
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}
```

### Weight Calculation

```typescript
// src/lib/manhour/calculate-weight.ts

import { parseSize, ParsedSize } from './parse-size';

export interface WeightResult {
  weight: number;
  basis: 'dimension' | 'fixed' | 'linear_feet' | 'manual';
  metadata: Record<string, unknown>;
}

export function calculateWeight(
  identityKey: Record<string, unknown>,
  componentType: string
): WeightResult {
  const sizeString = identityKey['size'] as string | undefined;
  const linearFeet = identityKey['linear_feet'] as number | undefined;

  // Parse size
  const parsed = parseSize(sizeString ?? '');

  // No parseable size → fixed weight
  if (parsed.diameter === null) {
    return {
      weight: 1.0,
      basis: 'fixed',
      metadata: { reason: 'No parseable size', raw_size: sizeString }
    };
  }

  // Threaded pipe with linear feet
  if (componentType === 'threaded_pipe' && linearFeet != null) {
    const weight = Math.pow(parsed.diameter, 1.5) * linearFeet * 0.1;
    return {
      weight,
      basis: 'linear_feet',
      metadata: {
        raw_size: sizeString,
        parsed_diameter: parsed.diameter,
        linear_feet: linearFeet,
        formula: `POWER(${parsed.diameter}, 1.5) * ${linearFeet} * 0.1`
      }
    };
  }

  // Reducer → average of both diameters
  if (parsed.isReducer && parsed.secondDiameter != null) {
    const avgDiameter = (parsed.diameter + parsed.secondDiameter) / 2;
    const weight = Math.pow(avgDiameter, 1.5);
    return {
      weight,
      basis: 'dimension',
      metadata: {
        raw_size: sizeString,
        parsed_diameter: avgDiameter,
        is_reducer: true,
        formula: `POWER((${parsed.diameter} + ${parsed.secondDiameter}) / 2, 1.5)`
      }
    };
  }

  // Standard component
  const weight = Math.pow(parsed.diameter, 1.5);
  return {
    weight,
    basis: 'dimension',
    metadata: {
      raw_size: sizeString,
      parsed_diameter: parsed.diameter,
      formula: `POWER(${parsed.diameter}, 1.5)`
    }
  };
}
```

### Permission Helper

```typescript
// src/lib/permissions/manhour-permissions.ts

import { usePermissions } from '@/hooks/usePermissions';

export function useManhourPermissions() {
  const { role } = usePermissions();

  const canViewManhours = ['owner', 'admin', 'project_manager'].includes(role ?? '');
  const canEditBudget = canViewManhours;

  return { canViewManhours, canEditBudget };
}
```

### Budget Hook

```typescript
// src/hooks/useManhourBudget.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ManhourBudget {
  id: string;
  project_id: string;
  version_number: number;
  total_budgeted_manhours: number;
  revision_reason: string;
  effective_date: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export function useManhourBudget(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'manhour-budget'],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('project_manhour_budgets')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as ManhourBudget | null;
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateManhourBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      totalBudgetedManhours: number;
      revisionReason: string;
      effectiveDate?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_manhour_budget', {
        p_project_id: params.projectId,
        p_total_budgeted_manhours: params.totalBudgetedManhours,
        p_revision_reason: params.revisionReason,
        p_effective_date: params.effectiveDate ?? new Date().toISOString().split('T')[0],
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'manhour-budget'],
      });
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'manhour-summary'],
      });
    },
  });
}
```

### Dashboard Widget

```tsx
// src/components/dashboard/ManhourSummaryWidget.tsx

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useProjectManhours } from '@/hooks/useProjectManhours';
import { useManhourPermissions } from '@/lib/permissions/manhour-permissions';
import { useProject } from '@/hooks/useProject';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';

export function ManhourSummaryWidget() {
  const { project } = useProject();
  const { canViewManhours } = useManhourPermissions();
  const { data: summary, isLoading } = useProjectManhours(project?.id);

  // Hide widget for unauthorized users
  if (!canViewManhours) return null;

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manhour Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No budget configured
  if (!summary?.has_budget) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manhour Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            No manhour budget configured for this project.
          </p>
          <Link
            to={`/projects/${project?.id}/settings/manhours`}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Settings className="h-4 w-4" />
            Configure Budget
          </Link>
        </CardContent>
      </Card>
    );
  }

  const budget = summary.budget;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manhour Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Budgeted</p>
            <p className="text-2xl font-semibold">
              {budget.total_budgeted_mh.toLocaleString()} MH
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Earned</p>
            <p className="text-2xl font-semibold">
              {budget.earned_mh.toLocaleString()} MH
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="text-2xl font-semibold">
              {budget.remaining_mh.toLocaleString()} MH
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Complete</p>
            <p className="text-2xl font-semibold">
              {budget.percent_complete.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Migration Example

```sql
-- Migration: create_manhour_tables.sql

-- Tables
CREATE TABLE project_manhour_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  total_budgeted_manhours NUMERIC(12,2) NOT NULL CHECK (total_budgeted_manhours > 0),
  revision_reason TEXT NOT NULL,
  effective_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, version_number)
);

CREATE TABLE manhour_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES project_manhour_budgets(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (dimension IN ('area', 'system', 'test_package', 'component_type')),
  dimension_value TEXT NOT NULL,
  dimension_id UUID,
  allocated_manhours NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (budget_id, dimension, dimension_value)
);

CREATE TABLE component_manhours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL UNIQUE REFERENCES components(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  budget_id UUID NOT NULL REFERENCES project_manhour_budgets(id) ON DELETE CASCADE,
  budgeted_manhours NUMERIC(10,4) NOT NULL DEFAULT 0,
  earned_manhours NUMERIC(10,4) NOT NULL DEFAULT 0,
  weight_value NUMERIC(10,4) NOT NULL,
  calculation_basis TEXT NOT NULL CHECK (calculation_basis IN ('dimension', 'fixed', 'linear_feet', 'manual')),
  calculation_metadata JSONB DEFAULT '{}',
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (AFTER tables are created)
ALTER TABLE project_manhour_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE manhour_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_manhours ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_manhour_budgets_project_active ON project_manhour_budgets(project_id) WHERE is_active = true;
CREATE INDEX idx_manhour_budgets_project ON project_manhour_budgets(project_id);
CREATE INDEX idx_manhour_buckets_budget ON manhour_buckets(budget_id);
CREATE INDEX idx_component_manhours_project ON component_manhours(project_id);
CREATE INDEX idx_component_manhours_component ON component_manhours(component_id);
CREATE INDEX idx_component_manhours_budget ON component_manhours(budget_id);

-- Trigger to ensure only one active budget per project
CREATE OR REPLACE FUNCTION ensure_single_active_budget()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE project_manhour_budgets
    SET is_active = false
    WHERE project_id = NEW.project_id
    AND id != NEW.id
    AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_single_active_budget
BEFORE INSERT OR UPDATE ON project_manhour_budgets
FOR EACH ROW EXECUTE FUNCTION ensure_single_active_budget();
```

---

## Testing Checklist

### Unit Tests
- [ ] `parse-size.ts`: All SIZE formats (integers, fractions, reducers, invalid)
- [ ] `calculate-weight.ts`: All component types, edge cases
- [ ] `manhour-permissions.ts`: Role-based access

### Integration Tests
- [ ] Budget creation with distribution
- [ ] Earned value update on milestone change
- [ ] Aggregation views return correct totals
- [ ] RLS policies block unauthorized access

### Acceptance Tests
- [ ] US1: Create budget and see distribution results
- [ ] US2: Dashboard widget shows summary
- [ ] US3: Milestone completion updates earned value
- [ ] US4: Budget versioning preserves history
- [ ] US5: Reports show manhours by dimension
- [ ] US6: Component modal shows manhours
- [ ] US7: Exports include manhour columns

---

## Common Pitfalls

### 1. Forgetting to regenerate types
After pushing migrations, always run:
```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

### 2. Missing RLS policies
New tables must have RLS enabled AND policies created in the same migration.

### 3. Stale TanStack Query cache
After mutation, invalidate related queries:
```typescript
queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'manhour-budget'] });
queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'manhour-summary'] });
```

### 4. Numeric precision
Use `NUMERIC(10,4)` for manhours to avoid floating-point errors. In TypeScript, use `toFixed(2)` for display.

### 5. Component modal conditional rendering
Always check permissions before rendering manhour section:
```tsx
{canViewManhours && <ManhourSection componentId={component.id} />}
```

---

## Performance Notes

- Budget distribution for 5,000 components should complete in <30 seconds
- Use batch INSERT in single transaction
- Aggregation views use existing indexes on area_id, system_id, test_package_id
- Dashboard query cached for 60 seconds via TanStack Query
