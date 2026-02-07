/**
 * ComponentRow component (Feature 007)
 * Single row in virtualized component list
 */

import { CSSProperties } from 'react';
import type { Database } from '@/types/database.types';
import { formatIdentityKey as formatDrawingComponentKey } from '@/lib/formatIdentityKey';
import { formatIdentityKey as formatFieldWeldKey } from '@/lib/field-weld-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MilestoneChips } from '@/components/milestones/MilestoneChips';
import { cn } from '@/lib/utils';

type Component = Database['public']['Tables']['components']['Row'];

interface MilestoneConfig {
  name: string;
  weight: number;
  order: number;
  is_partial: boolean;
  requires_welder: boolean;
}

interface ComponentRowProps {
  component: Component & {
    drawing?: { drawing_no_norm: string } | null;
    area?: { name: string } | null;
    system?: { name: string } | null;
    test_package?: { name: string } | null;
    effective_template?: {
      milestones_config: MilestoneConfig[] | null;
      uses_project_templates: boolean | null;
    } | null;
  };
  visibleColumns: string[];
  style: CSSProperties; // Positioning styles from react-virtual
  onClick?: () => void; // Keep for backwards compat but won't be used

  // Selection props
  isSelected: boolean;
  onSelectionChange: (isSelected: boolean) => void;
  onView: () => void; // Keep for backwards compat
  density?: 'compact' | 'comfortable';

  // NEW: Two-mode support (Feature 034)
  selectionMode?: boolean; // Default true for backwards compat
  onOpenDetails?: () => void; // Callback for browse mode row click
  rowIndex: number; // For range selection
  onRowClick?: (shiftKey: boolean) => void; // Callback for row click with shift key info
}

/**
 * Format component type for display
 */
function formatComponentType(type: string | null): string {
  if (!type) return '—';
  // Convert snake_case to Title Case
  return type.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}


/**
 * ComponentRow component
 * Displays a single component in the virtualized list
 *
 * Two modes:
 * - Selection mode (selectionMode=true): Row click toggles selection, checkbox visible
 * - Browse mode (selectionMode=false): Row click opens details, no checkbox
 */
export function ComponentRow({
  component,
  visibleColumns,
  style,
  onClick: _onClick, // Kept for backwards compat but unused
  isSelected,
  onSelectionChange,
  onView: _onView, // Kept for backwards compat but unused
  density = 'comfortable',
  selectionMode = true, // Default true for backwards compat
  onOpenDetails,
  rowIndex: _rowIndex, // For debugging/logging
  onRowClick
}: ComponentRowProps) {
  // Format identity key based on component type
  const identityKey = component.identity_key as Record<string, unknown> | null;
  let identityDisplay: string;

  if (component.component_type === 'field_weld') {
    // Field welds use weld_number from identity_key
    identityDisplay = identityKey
      ? formatFieldWeldKey(identityKey, component.component_type)
      : 'Unknown Weld';
  } else if (component.component_type === 'spool') {
    // Spools use spool_id from identity_key
    identityDisplay = (identityKey?.spool_id as string) || 'Unknown Spool';
  } else {
    // Other components use commodity_code, size, seq format
    identityDisplay = identityKey && component.component_type
      ? formatDrawingComponentKey(
          identityKey as Parameters<typeof formatDrawingComponentKey>[0],
          component.component_type as Parameters<typeof formatDrawingComponentKey>[1]
        )
      : 'Unknown Component';
  }

  // Get milestones config and current values for MilestoneChips
  const milestonesConfig = component.effective_template?.milestones_config as MilestoneConfig[] | null;
  const currentMilestones = component.current_milestones as Record<string, boolean | number> | null;

  // Clamp percent to 0-100 range
  const percent = Math.max(0, Math.min(100, component.percent_complete ?? 0));

  return (
    <div
      style={style}
      onClick={(e) => {
        if (selectionMode) {
          // Notify parent about the click (with shift key state)
          onRowClick?.(e.shiftKey);
          // Toggle selection only if NOT shift-clicking (range selection handled by parent)
          if (!e.shiftKey) {
            onSelectionChange(!isSelected);
          }
        } else {
          onOpenDetails?.();
        }
      }}
      className={cn(
        "flex items-center gap-4 px-4 border-b hover:bg-muted/50 cursor-pointer transition-colors",
        density === 'compact' ? 'py-1.5' : 'py-3',
        isSelected && selectionMode && "bg-muted"
      )}
    >
      {/* Checkbox Column - only visible in selection mode */}
      {selectionMode && (
        <div className="w-10 flex-shrink-0 flex items-center justify-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectionChange(!!checked)}
            onClick={(e) => e.stopPropagation()} // Prevent double-toggle
            className="h-5 w-5"
            aria-label={`Select ${identityDisplay}`}
          />
        </div>
      )}

      {/* Drawing - hideable */}
      {visibleColumns.includes('drawing') && (
        <div className="flex-1 min-w-0 hidden md:block">
          <div className="text-sm truncate">
            {component.drawing?.drawing_no_norm || '—'}
          </div>
        </div>
      )}

      {/* Identity Key - always visible */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{identityDisplay}</span>
          {component.post_hydro_install && (
            <Badge
              variant="outline"
              className="text-xs bg-amber-50 text-amber-700 border-amber-200 flex-shrink-0"
              aria-label="Post-Hydro installation"
            >
              Post-Hydro
            </Badge>
          )}
        </div>
      </div>

      {/* Type - hideable */}
      {visibleColumns.includes('component_type') && (
        <div className="w-24 hidden md:block">
          <div className="text-sm truncate">
            {formatComponentType(component.component_type)}
          </div>
        </div>
      )}

      {/* Progress - always visible */}
      <div className="w-28 flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-sm font-semibold w-10 text-right">
          {percent}%
        </span>
      </div>

      {/* Milestones - hideable */}
      {visibleColumns.includes('milestones') && (
        <div className="flex-1 min-w-0 hidden xl:block">
          {milestonesConfig && currentMilestones ? (
            <MilestoneChips
              milestonesConfig={milestonesConfig}
              currentMilestones={currentMilestones}
              compact
            />
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </div>
      )}

      {/* Footage - hideable */}
      {visibleColumns.includes('footage') && (
        <div className="w-24 hidden lg:block">
          <div className="text-sm truncate">
            {component.component_type === 'pipe' || component.component_type === 'threaded_pipe'
              ? (() => {
                  const attrs = component.attributes as Record<string, unknown> | null;
                  const feet = typeof attrs?.total_linear_feet === 'number' ? attrs.total_linear_feet : null;
                  return feet !== null ? `${feet.toLocaleString()} LF` : '—';
                })()
              : '—'}
          </div>
        </div>
      )}

      {/* Area - hideable */}
      {visibleColumns.includes('area') && (
        <div className="w-24 hidden lg:block">
          <div className="text-sm truncate">
            {component.area?.name || '—'}
          </div>
        </div>
      )}

      {/* System - hideable */}
      {visibleColumns.includes('system') && (
        <div className="w-24 hidden lg:block">
          <div className="text-sm truncate">
            {component.system?.name || '—'}
          </div>
        </div>
      )}

      {/* Package - hideable */}
      {visibleColumns.includes('test_package') && (
        <div className="w-24 hidden xl:block">
          <div className="text-sm truncate">
            {component.test_package?.name || '—'}
          </div>
        </div>
      )}
    </div>
  );
}
