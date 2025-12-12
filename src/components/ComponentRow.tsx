/**
 * ComponentRow component (Feature 007)
 * Single row in virtualized component list
 */

import { CSSProperties } from 'react';
import type { Database } from '@/types/database.types';
import { formatIdentityKey as formatDrawingComponentKey } from '@/lib/formatIdentityKey';
import { formatIdentityKey as formatFieldWeldKey } from '@/lib/field-weld-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MilestoneChips } from '@/components/milestones/MilestoneChips';
import { Eye } from 'lucide-react';
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

  // NEW props
  isSelected: boolean;
  onSelectionChange: (isSelected: boolean) => void;
  onView: () => void;
  density?: 'compact' | 'comfortable';
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
 * Includes selection checkbox, identity key, type, area, system, package, milestones, progress %, and actions
 */
export function ComponentRow({
  component,
  visibleColumns,
  style,
  onClick: _onClick, // Kept for backwards compat but unused
  isSelected,
  onSelectionChange,
  onView,
  density = 'comfortable'
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
      onClick={() => onSelectionChange(!isSelected)}
      className={cn(
        "flex items-center gap-4 px-4 border-b hover:bg-muted/50 cursor-pointer transition-colors",
        density === 'compact' ? 'py-1.5' : 'py-3',
        isSelected && "bg-muted"
      )}
    >
      {/* Checkbox Column */}
      <div className="w-10 flex-shrink-0 flex items-center justify-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(!!checked)}
          onClick={(e) => e.stopPropagation()} // Prevent double-toggle
          className="h-5 w-5"
          aria-label={`Select ${identityDisplay}`}
        />
      </div>

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
        <div className="font-medium truncate">{identityDisplay}</div>
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

      {/* Actions Column */}
      <div className="w-12 flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation(); // Don't toggle selection
            onView();
          }}
          aria-label={`View details for ${identityDisplay}`}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
