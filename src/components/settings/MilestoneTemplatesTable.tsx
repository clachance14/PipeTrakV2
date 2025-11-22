import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useUpdateProjectTemplates } from '@/hooks/useUpdateProjectTemplates';
import { RotateCcw, ChevronDown } from 'lucide-react';

// Type definitions based on DB schema
interface Template {
  id: string;
  component_type: string;
  milestone_name: string;
  milestone_order: number;
  weight: number;
  updated_at: string;
}

interface MilestoneTemplatesTableProps {
  projectId: string;
  templates: Template[];
  onRefresh?: () => void;
}

export function MilestoneTemplatesTable({ projectId, templates, onRefresh }: MilestoneTemplatesTableProps) {
  // --- State ---
  // Stores the current editing state: componentType -> milestoneName -> weight
  const [localWeights, setLocalWeights] = useState<Record<string, Record<string, number>>>({});
  // Tracks which component types have been modified
  const [modifiedTypes, setModifiedTypes] = useState<Set<string>>(new Set());
  // Global setting for applying to existing components
  const [applyToExisting, setApplyToExisting] = useState(false);
  
  const updateMutation = useUpdateProjectTemplates(projectId);

  // --- Data Processing ---

  // Group templates by component type to structure the rows
  const rows = useMemo(() => {
    const grouped: Record<string, Record<string, Template>> = {};
    templates.forEach(t => {
      if (!grouped[t.component_type]) {
        grouped[t.component_type] = {};
      }
      grouped[t.component_type][t.milestone_name] = t;
    });
    return grouped;
  }, [templates]);

  // Determine all unique milestones and their display order
  const columns = useMemo(() => {
    const milestones = new Map<string, number>();
    templates.forEach(t => {
      if (!milestones.has(t.milestone_name)) {
        milestones.set(t.milestone_name, t.milestone_order);
      }
    });
    // Sort by order
    return Array.from(milestones.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([name]) => name);
  }, [templates]);

  // Initialize local state when templates load
  useEffect(() => {
    const initialWeights: Record<string, Record<string, number>> = {};
    Object.entries(rows).forEach(([type, milestones]) => {
      initialWeights[type] = {};
      Object.entries(milestones).forEach(([name, t]) => {
        initialWeights[type][name] = t.weight;
      });
    });
    setLocalWeights(initialWeights);
    setModifiedTypes(new Set());
  }, [rows]);

  // --- Handlers ---

  const handleWeightChange = (componentType: string, milestone: string, val: string) => {
    const numVal = parseFloat(val);
    if (isNaN(numVal)) return;

    setLocalWeights(prev => ({
      ...prev,
      [componentType]: {
        ...prev[componentType],
        [milestone]: numVal
      }
    }));
    setModifiedTypes(prev => new Set(prev).add(componentType));
  };

  const handleBulkUpdate = (milestone: string, val: number) => {
    setLocalWeights(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(type => {
        // Only update if this component type has this milestone
        if (next[type][milestone] !== undefined) {
          next[type] = {
            ...next[type],
            [milestone]: val
          };
        }
      });
      return next;
    });
    // Mark all types that have this milestone as modified
    setModifiedTypes(prev => {
      const next = new Set(prev);
      Object.keys(rows).forEach(type => {
        if (rows[type][milestone]) {
          next.add(type);
        }
      });
      return next;
    });
  };

  const handleResetRow = (componentType: string) => {
    setLocalWeights(prev => {
      const next = { ...prev };
      next[componentType] = {};
      Object.entries(rows[componentType]).forEach(([name, t]) => {
        next[componentType][name] = t.weight;
      });
      return next;
    });
    setModifiedTypes(prev => {
      const next = new Set(prev);
      next.delete(componentType);
      return next;
    });
  };

  const handleSaveAll = async () => {
    const typesToSave = Array.from(modifiedTypes);
    if (typesToSave.length === 0) return;

    // Validation check
    const errors: string[] = [];
    typesToSave.forEach(type => {
      const typeWeights = localWeights[type];
      const total = Object.values(typeWeights).reduce((a, b) => a + b, 0);
      if (Math.abs(total - 100) > 0.01) { // Float tolerance
        errors.push(`${type}: Total weight is ${total}% (must be 100%)`);
      }
    });

    if (errors.length > 0) {
      toast.error("Validation Error", {
        description: (
          <ul className="list-disc pl-4">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )
      });
      return;
    }

    // Execute updates
    let successCount = 0;
    const promises = typesToSave.map(async (type) => {
      const weights = Object.entries(localWeights[type]).map(([name, weight]) => ({
        milestone_name: name,
        weight
      }));
      
      // Get lastUpdated from the first template of this type (approximate, but usable for opt-lock if they are consistent)
      // Ideally we check the most recent updated_at of the group
      const typeTemplates = Object.values(rows[type]);
      const lastUpdated = typeTemplates.reduce((latest, t) => 
        t.updated_at > latest ? t.updated_at : latest
      , '1970-01-01');

      try {
        await updateMutation.mutateAsync({
          componentType: type,
          weights,
          applyToExisting,
          lastUpdated
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to update ${type}`, err);
      }
    });

    try {
      await Promise.all(promises);
      toast.success(`Updated ${successCount} component types`);
      setModifiedTypes(new Set());
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error("Some updates failed. Check console for details.");
    }
  };

  // --- Helpers ---

  const getRowTotal = (type: string) => {
    const w = localWeights[type];
    if (!w) return 0;
    return Object.values(w).reduce((a, b) => a + b, 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center space-x-4">
            <div className="flex items-start space-x-3">
            <Checkbox
                id="apply-existing-table"
                checked={applyToExisting}
                onCheckedChange={(c) => setApplyToExisting(c === true)}
            />
            <div className="space-y-1">
                <label
                htmlFor="apply-existing-table"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                Apply to existing components
                </label>
                <p className="text-xs text-gray-500">
                Recalculate progress for existing components
                </p>
            </div>
            </div>
        </div>
        <Button 
            onClick={handleSaveAll} 
            disabled={modifiedTypes.size === 0 || updateMutation.isPending}
        >
            {updateMutation.isPending ? 'Saving...' : `Save ${modifiedTypes.size} Changes`}
        </Button>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 uppercase font-medium border-b">
            <tr>
              <th className="px-4 py-2 w-48">Component Type</th>
              {columns.map(col => (
                <th key={col} className="px-2 py-2 min-w-[80px]">
                  <div className="flex items-center justify-between space-x-0.5">
                    <span className="truncate">{col}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0">
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => {
                            const val = prompt(`Enter new weight for all ${col} milestones:`);
                            if (val && !isNaN(parseFloat(val))) {
                                handleBulkUpdate(col, parseFloat(val));
                            }
                        }}>
                          Set all to...
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
              ))}
              <th className="px-4 py-2 w-24 text-center">Total</th>
              <th className="px-4 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Object.keys(rows).sort().map(type => {
              const total = getRowTotal(type);
              const isModified = modifiedTypes.has(type);
              const isValid = Math.abs(total - 100) < 0.01;

              return (
                <tr key={type} className={isModified ? 'bg-blue-50/30' : ''}>
                  <td className="px-4 py-2 font-medium">{type}</td>
                  {columns.map(col => {
                    const exists = rows[type][col] !== undefined;
                    const val = localWeights[type]?.[col] ?? 0;
                    
                    if (!exists) {
                      return <td key={col} className="px-2 py-2 text-center text-gray-300">-</td>;
                    }

                    return (
                      <td key={col} className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-8 w-16 text-right"
                            value={val}
                            onChange={(e) => handleWeightChange(type, col, e.target.value)}
                          />
                          <span className="text-sm">%</span>
                        </div>
                      </td>
                    );
                  })}
                  <td className={`px-4 py-2 text-center font-bold ${!isValid ? 'text-red-600' : 'text-green-600'}`}>
                    {total}%
                  </td>
                  <td className="px-4 py-2 text-center">
                    {isModified && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleResetRow(type)}
                        title="Reset changes"
                      >
                        <RotateCcw className="h-4 w-4 text-gray-500" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
