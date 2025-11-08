/**
 * ComponentRow component (Feature 007)
 * Single row in virtualized component list
 */

import { CSSProperties } from 'react';
import type { Database } from '@/types/database.types';
import { formatIdentityKey as formatDrawingComponentKey } from '@/lib/formatIdentityKey';
import { formatIdentityKey as formatFieldWeldKey } from '@/lib/field-weld-utils';

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
  // Format identity key based on component type
  let identityDisplay: string;
  if (component.component_type === 'field_weld') {
    // Field welds use weld_number from identity_key
    identityDisplay = formatFieldWeldKey(
      component.identity_key as Record<string, unknown>,
      component.component_type
    );
  } else if (component.component_type === 'spool') {
    // Spools use spool_id from identity_key
    const key = component.identity_key as Record<string, unknown>;
    identityDisplay = (key?.spool_id as string) || 'Unknown Spool';
  } else {
    // Other components use commodity_code, size, seq format
    identityDisplay = formatDrawingComponentKey(
      component.identity_key as any,
      component.component_type as any
    );
  }

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
      className="flex items-center gap-4 px-4 py-3 border-b hover:bg-muted/50 cursor-pointer transition-colors"
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
