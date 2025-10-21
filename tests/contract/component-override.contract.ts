/**
 * Contract: Component Assignment Override
 *
 * Defines enhancements to the existing ComponentAssignDialog to support
 * overriding inherited values and clearing all assignments.
 *
 * Functional Requirements Covered:
 * - FR-031 to FR-036: Component assignment override functionality
 * - Show inheritance warning when overriding
 * - Display current values with "(inherited from drawing)" notation
 * - Provide "Clear all assignments" checkbox
 */

/**
 * Metadata field value with inheritance status
 */
export interface MetadataFieldValue {
  /** Current UUID value (or null if unassigned) */
  value: string | null;

  /** Whether this value is inherited from the parent drawing */
  inherited: boolean;

  /** Name to display in dropdown (e.g., "Area 100") */
  displayName?: string;
}

/**
 * Current values for component assignment dialog
 * Extends existing ComponentAssignDialog functionality
 */
export interface ComponentAssignmentValues {
  /** Area assignment with inheritance status */
  area: MetadataFieldValue;

  /** System assignment with inheritance status */
  system: MetadataFieldValue;

  /** Test package assignment with inheritance status */
  test_package: MetadataFieldValue;
}

/**
 * Contract interface for component assignment override
 * Extends the existing ComponentAssignDialog component
 */
export interface ComponentOverrideContract {
  /**
   * Whether to show the inheritance override warning
   *
   * True if any of the current values are inherited (FR-033)
   * Warning text: "Changing these values will override the drawing's assignments for this component only"
   */
  showInheritanceWarning: boolean;

  /**
   * Current metadata values with inheritance status
   *
   * Used to populate dropdowns with "(inherited from drawing)" notation
   * Example: "Area 100 (inherited from drawing P-001)"
   */
  currentValues: ComponentAssignmentValues;

  /**
   * Clear all assignments (set to NULL)
   *
   * @returns Promise that resolves when all fields are cleared
   * @throws Error if database update fails or user lacks permission
   *
   * Behavior (FR-035):
   * - Sets component.area_id = NULL
   * - Sets component.system_id = NULL
   * - Sets component.test_package_id = NULL
   * - After clearing, if drawing has assignments, component will re-inherit (FR-036)
   * - Creates audit log entry for each field cleared
   */
  clearAllAssignments(): Promise<void>;
}

/**
 * Expected enhancements to existing ComponentAssignDialog:
 *
 * ```typescript
 * // src/components/ComponentAssignDialog.tsx
 * import { useMemo } from 'react';
 * import { getBadgeType } from '@/lib/metadata-inheritance';
 *
 * interface ComponentAssignDialogProps {
 *   componentId: string;
 *   projectId: string;
 *   open: boolean;
 *   onOpenChange: (open: boolean) => void;
 *   onSuccess?: () => void;
 * }
 *
 * export function ComponentAssignDialog(props: ComponentAssignDialogProps) {
 *   const { data: component } = useComponent(props.componentId);
 *   const { data: drawing } = useDrawing(component?.drawing_id);
 *   const { data: areas } = useAreas(props.projectId);
 *   const { data: systems } = useSystems(props.projectId);
 *   const { data: testPackages } = useTestPackages(props.projectId);
 *
 *   const assignMutation = useAssignComponent();
 *   const clearMutation = useClearComponentAssignments();
 *
 *   // Determine inheritance status for each field
 *   const currentValues: ComponentAssignmentValues = useMemo(() => {
 *     if (!component || !drawing) return { area: { value: null, inherited: false }, ... };
 *
 *     return {
 *       area: {
 *         value: component.area_id,
 *         inherited: getBadgeType(component.area_id, drawing.area_id) === 'inherited',
 *         displayName: areas?.find(a => a.id === component.area_id)?.name,
 *       },
 *       system: {
 *         value: component.system_id,
 *         inherited: getBadgeType(component.system_id, drawing.system_id) === 'inherited',
 *         displayName: systems?.find(s => s.id === component.system_id)?.name,
 *       },
 *       test_package: {
 *         value: component.test_package_id,
 *         inherited: getBadgeType(component.test_package_id, drawing.test_package_id) === 'inherited',
 *         displayName: testPackages?.find(p => p.id === component.test_package_id)?.name,
 *       },
 *     };
 *   }, [component, drawing, areas, systems, testPackages]);
 *
 *   // Show warning if any field is inherited
 *   const showInheritanceWarning = useMemo(() => {
 *     return currentValues.area.inherited ||
 *            currentValues.system.inherited ||
 *            currentValues.test_package.inherited;
 *   }, [currentValues]);
 *
 *   const handleClearAll = async () => {
 *     await clearMutation.mutateAsync({ component_id: props.componentId });
 *     toast.success('All assignments cleared');
 *     props.onSuccess?.();
 *   };
 *
 *   return (
 *     <Dialog open={props.open} onOpenChange={props.onOpenChange}>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Assign Component Metadata</DialogTitle>
 *           <DialogDescription>
 *             Assigning to: {component?.identity_display} on {drawing?.drawing_no_norm}
 *           </DialogDescription>
 *         </DialogHeader>
 *
 *         {showInheritanceWarning && (
 *           <Alert variant="warning">
 *             <AlertDescription>
 *               Changing these values will override the drawing's assignments for this component only.
 *             </AlertDescription>
 *           </Alert>
 *         )}
 *
 *         <div className="space-y-4">
 *           <div>
 *             <Label>Area</Label>
 *             <Select value={selectedArea} onValueChange={setSelectedArea}>
 *               <SelectTrigger>
 *                 <SelectValue>
 *                   {currentValues.area.inherited
 *                     ? `${currentValues.area.displayName} (inherited from drawing)`
 *                     : currentValues.area.displayName
 *                   }
 *                 </SelectValue>
 *               </SelectTrigger>
 *               <SelectContent>
 *                 <SelectItem value="none">None</SelectItem>
 *                 {areas?.map(area => (
 *                   <SelectItem key={area.id} value={area.id}>
 *                     {area.name}
 *                   </SelectItem>
 *                 ))}
 *               </SelectContent>
 *             </Select>
 *           </div>
 *
 *           {/* Repeat for System and Test Package */}
 *
 *           <div className="flex items-center space-x-2">
 *             <Checkbox
 *               id="clear-all"
 *               checked={clearAllChecked}
 *               onCheckedChange={setClearAllChecked}
 *             />
 *             <Label htmlFor="clear-all">
 *               Clear all assignments (set to None)
 *             </Label>
 *           </div>
 *         </div>
 *
 *         <DialogFooter>
 *           <Button variant="outline" onClick={() => props.onOpenChange(false)}>
 *             Cancel
 *           </Button>
 *           <Button
 *             onClick={clearAllChecked ? handleClearAll : handleAssign}
 *             disabled={assignMutation.isPending || clearMutation.isPending}
 *           >
 *             {clearAllChecked ? 'Clear All' : 'Update Component'}
 *           </Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 *   );
 * }
 * ```
 */

/**
 * Database mutation for clearing assignments:
 *
 * ```typescript
 * // src/hooks/useComponentAssignment.ts
 * export function useClearComponentAssignments() {
 *   const queryClient = useQueryClient();
 *
 *   return useMutation({
 *     mutationFn: async ({ component_id }: { component_id: string }) => {
 *       const { data, error } = await supabase
 *         .from('components')
 *         .update({
 *           area_id: null,
 *           system_id: null,
 *           test_package_id: null,
 *           updated_at: new Date().toISOString(),
 *         })
 *         .eq('id', component_id)
 *         .select()
 *         .single();
 *
 *       if (error) throw error;
 *       return data;
 *     },
 *
 *     onSuccess: () => {
 *       queryClient.invalidateQueries({ queryKey: ['components'] });
 *       queryClient.invalidateQueries({ queryKey: ['drawings-with-progress'] });
 *     },
 *   });
 * }
 * ```
 */

/**
 * Re-inheritance behavior after clearing (FR-036):
 *
 * 1. Component has Area 200 (manually assigned)
 *    - Drawing has Area 100
 *    - getBadgeType('area-200-uuid', 'area-100-uuid') → 'assigned'
 *    - Display: "Area 200 (assigned)" with blue badge
 *
 * 2. User clicks "Clear all assignments"
 *    - Database: component.area_id = NULL, system_id = NULL, test_package_id = NULL
 *    - Mutation succeeds, queries invalidated
 *    - Component row re-renders
 *
 * 3. After clearing, component shows:
 *    - getBadgeType(null, 'area-100-uuid') → 'none'
 *    - Display: "—" (no badge, no value)
 *
 * 4. Next time drawing is assigned Area 100 again:
 *    - RPC function finds component.area_id IS NULL
 *    - Sets component.area_id = 'area-100-uuid' (inherits)
 *    - getBadgeType('area-100-uuid', 'area-100-uuid') → 'inherited'
 *    - Display: "Area 100 (inherited)" with gray badge
 *
 * NOTE: Re-inheritance does NOT happen automatically when component is cleared.
 * It only happens during the next drawing assignment operation.
 * This is intentional per spec.md edge case "Component Assignment After Drawing Assignment".
 */

/**
 * Test scenarios:
 *
 * 1. Component with all inherited values:
 *    - showInheritanceWarning → true
 *    - currentValues.area.inherited → true
 *    - currentValues.system.inherited → true
 *    - currentValues.test_package.inherited → true
 *    - Warning shown: "Changing these values will override..."
 *
 * 2. Component with mixed inherited and assigned:
 *    - currentValues.area.inherited → true (from drawing)
 *    - currentValues.system.inherited → false (manually set)
 *    - currentValues.test_package.inherited → false (NULL)
 *    - Warning shown because at least one is inherited
 *
 * 3. Component with all manually assigned:
 *    - showInheritanceWarning → false
 *    - No warning shown
 *    - Dialog works same as before this feature
 *
 * 4. User checks "Clear all assignments":
 *    - clearAllChecked → true
 *    - Button text changes: "Clear All"
 *    - On click: calls handleClearAll instead of handleAssign
 *    - Success: All 3 fields set to NULL, toast shown
 *
 * 5. User unchecks "Clear all" and changes Area:
 *    - clearAllChecked → false
 *    - Button text: "Update Component"
 *    - On click: calls handleAssign (existing behavior)
 *    - Only selected field(s) updated
 */
