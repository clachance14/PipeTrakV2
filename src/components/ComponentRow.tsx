/**
 * ComponentRow component (Feature 007)
 * Single row in virtualized component list
 */

import { CSSProperties } from 'react';
import type { Database } from '@/types/database.types';

type Component = Database['public']['Tables']['components']['Row'];

interface ComponentRowProps {
  component: Component & {
    drawing?: { drawing_no_norm: string } | null;
    area?: { name: string } | null;
    system?: { name: string } | null;
    test_package?: { name: string } | null;
  };
  style: CSSProperties; // Positioning styles from react-virtual
  onClick?: () => void;
}

/**
 * ComponentRow component
 * Displays a single component in the virtualized list
 * Includes identity key, type, area, system, package, and progress %
 */
export function ComponentRow({ component, style, onClick }: ComponentRowProps) {
  // Extract identity key display (first value or fallback)
  const identityDisplay = component.identity_key
    ? Object.values(component.identity_key)[0] || 'Unknown'
    : 'Unknown';

  // Format progress percentage
  const progressPercent = component.percent_complete
    ? `${component.percent_complete.toFixed(1)}%`
    : '0.0%';

  // Format last updated timestamp
  const lastUpdated = component.last_updated_at
    ? new Date(component.last_updated_at).toLocaleDateString()
    : 'Never';

  return (
    <div
      style={style}
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 border-b hover:bg-accent cursor-pointer transition-colors"
    >
      {/* Identity Key */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{identityDisplay}</div>
        <div className="text-sm text-muted-foreground">
          {component.component_type}
        </div>
      </div>

      {/* Drawing */}
      <div className="flex-1 min-w-0 hidden md:block">
        <div className="text-sm truncate">
          {component.drawing?.drawing_no_norm || 'No Drawing'}
        </div>
      </div>

      {/* Area */}
      <div className="flex-1 min-w-0 hidden lg:block">
        <div className="text-sm truncate">
          {component.area?.name || 'Unassigned'}
        </div>
      </div>

      {/* System */}
      <div className="flex-1 min-w-0 hidden lg:block">
        <div className="text-sm truncate">
          {component.system?.name || 'Unassigned'}
        </div>
      </div>

      {/* Test Package */}
      <div className="flex-1 min-w-0 hidden xl:block">
        <div className="text-sm truncate">
          {component.test_package?.name || 'Unassigned'}
        </div>
      </div>

      {/* Progress % */}
      <div className="w-20 text-right">
        <div className="font-medium">{progressPercent}</div>
        <div className="text-xs text-muted-foreground">{lastUpdated}</div>
      </div>
    </div>
  );
}
