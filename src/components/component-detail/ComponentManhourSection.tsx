/**
 * ComponentManhourSection - Manhour display in component detail modal
 *
 * Feature: 032-manhour-earned-value
 *
 * Displays component-level manhour data in a Card:
 * - Budgeted manhours
 * - Earned manhours (computed: budgeted * percent_complete / 100)
 *
 * Permission-based rendering:
 * - Only visible to Owner, Admin, PM roles (via useManhourPermissions)
 * - Returns null if user lacks permission
 * - Returns null if component has no budgeted_manhours
 *
 * @example
 * ```tsx
 * <ComponentManhourSection component={component} />
 * ```
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useManhourPermissions } from '@/lib/permissions/manhour-permissions';

interface ComponentManhourSectionProps {
  component: {
    id: string;
    budgeted_manhours: number | null;
    percent_complete: number;
  };
}

/**
 * ComponentManhourSection component
 *
 * Displays manhour metrics for a component in a 2x2 grid.
 * Only renders for authorized users with budgeted manhours.
 *
 * @param component - Component data with manhour fields
 */
export function ComponentManhourSection({ component }: ComponentManhourSectionProps) {
  const { canViewManhours } = useManhourPermissions();

  // Hide for unauthorized users
  if (!canViewManhours) return null;

  // Hide if no budget configured
  if (component.budgeted_manhours === null) return null;

  // Calculate earned manhours: budgeted × (percent_complete / 100)
  const earnedManhours = component.budgeted_manhours * (component.percent_complete / 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Manhours</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Budgeted</p>
            <p className="text-2xl font-semibold">
              {component.budgeted_manhours.toFixed(1)} MH
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Earned</p>
            <p className="text-2xl font-semibold">
              {earnedManhours.toFixed(1)} MH
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
