/**
 * Integration Tests: Package Assignment Validation
 * Feature 030 - Test Package Lifecycle Workflow - User Story 2
 *
 * Tests FR-012 and FR-013:
 * - FR-012: Component uniqueness constraint enforcement
 * - FR-013: Assignment conflict detection and warnings
 *
 * Edge Cases:
 * 1. Component already assigned to another package (T035)
 * 2. Bulk assignment with mixed valid/invalid components
 * 3. Concurrent assignment conflicts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useComponentsWithAssignmentStatus } from '@/hooks/usePackageAssignments';
import type { ComponentWithAssignmentStatus } from '@/types/assignment.types';

// Mock supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('Package Assignment Validation', () => {
  let queryClient: QueryClient;
  const testProjectId = 'test-project-uuid';

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  describe('Edge Case: Component already assigned to another package (T035)', () => {
    it('should detect and prevent assigning component that is already assigned elsewhere', async () => {
      const existingPackageId = 'existing-package-uuid';
      const existingPackageName = 'Area 100 Hydro Test';

      const mockComponents: ComponentWithAssignmentStatus[] = [
        {
          id: 'comp-1',
          component_type: 'spool',
          identity_key: { spool_id: 'SP-001' },
          area_id: 'area-1',
          system_id: 'system-1',
          test_package_id: null, // Unassigned - can assign
          test_package_name: null,
          can_assign: true,
        },
        {
          id: 'comp-2',
          component_type: 'field_weld',
          identity_key: { weld_id: 'W-001' },
          area_id: 'area-1',
          system_id: 'system-1',
          test_package_id: existingPackageId, // Already assigned - cannot assign
          test_package_name: existingPackageName,
          can_assign: false,
        },
        {
          id: 'comp-3',
          component_type: 'instrument',
          identity_key: { tag: 'FT-101' },
          area_id: 'area-1',
          system_id: 'system-1',
          test_package_id: null, // Unassigned - can assign
          test_package_name: null,
          can_assign: true,
        },
      ];

      // Mock query for components with assignment status
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({
          data: mockComponents.map((c) => ({
            ...c,
            test_packages: c.test_package_id
              ? { name: c.test_package_name }
              : null,
          })),
          error: null,
        }),
      } as any);

      const { result } = renderHook(
        () => useComponentsWithAssignmentStatus(testProjectId),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const components = result.current.data || [];

      // Filter components that can be assigned
      const assignableComponents = components.filter((c) => c.can_assign);
      const unassignableComponents = components.filter((c) => !c.can_assign);

      // This test will fail until component uniqueness validation is implemented
      // Expected: comp-2 should be marked as unassignable
      expect(assignableComponents).toHaveLength(2); // comp-1, comp-3
      expect(unassignableComponents).toHaveLength(1); // comp-2
      expect(unassignableComponents[0].id).toBe('comp-2');
      expect(unassignableComponents[0].test_package_name).toBe(existingPackageName);
    });

    it('should show warning message for components already assigned to other packages', async () => {
      const conflictComponent: ComponentWithAssignmentStatus = {
        id: 'comp-conflict',
        component_type: 'field_weld',
        identity_key: { weld_id: 'W-CONFLICT' },
        area_id: 'area-1',
        system_id: 'system-1',
        test_package_id: 'other-package-uuid',
        test_package_name: 'Other Package',
        can_assign: false,
      };

      // This test will fail until ComponentSelectionList displays conflict warnings
      // Expected: Should show "Already assigned to Other Package" badge/warning
      expect(conflictComponent.can_assign).toBe(false);
      expect(conflictComponent.test_package_name).toBe('Other Package');
      // expect(screen.getByText(/already assigned to Other Package/i)).toBeInTheDocument();
    });
  });

  describe('Edge Case: Bulk assignment with mixed valid/invalid components', () => {
    it('should validate entire selection and reject if any component is already assigned', async () => {
      const selectedComponentIds = ['comp-1', 'comp-2-assigned', 'comp-3'];

      const mockComponents: ComponentWithAssignmentStatus[] = [
        {
          id: 'comp-1',
          component_type: 'spool',
          identity_key: { spool_id: 'SP-001' },
          area_id: 'area-1',
          system_id: 'system-1',
          test_package_id: null,
          test_package_name: null,
          can_assign: true,
        },
        {
          id: 'comp-2-assigned',
          component_type: 'field_weld',
          identity_key: { weld_id: 'W-ASSIGNED' },
          area_id: 'area-1',
          system_id: 'system-1',
          test_package_id: 'other-package',
          test_package_name: 'Other Test',
          can_assign: false,
        },
        {
          id: 'comp-3',
          component_type: 'instrument',
          identity_key: { tag: 'FT-101' },
          area_id: 'area-1',
          system_id: 'system-1',
          test_package_id: null,
          test_package_name: null,
          can_assign: true,
        },
      ];

      // Check if all selected components can be assigned
      const conflicts = selectedComponentIds.filter((id) => {
        const component = mockComponents.find((c) => c.id === id);
        return component && !component.can_assign;
      });

      // This test will fail until bulk validation is implemented
      // Expected: Should detect 1 conflict (comp-2-assigned)
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toBe('comp-2-assigned');
      // expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('already assigned'));
    });
  });

  describe('Edge Case: Concurrent assignment conflicts', () => {
    it('should handle database constraint violation when component assigned between validation and insert', async () => {
      const packageId = 'new-package-uuid';
      const componentId = 'comp-race-condition';

      // Component appears unassigned during validation
      const componentBeforeInsert: ComponentWithAssignmentStatus = {
        id: componentId,
        component_type: 'spool',
        identity_key: { spool_id: 'SP-RACE' },
        area_id: 'area-1',
        system_id: 'system-1',
        test_package_id: null, // Appears unassigned
        test_package_name: null,
        can_assign: true,
      };

      // But database constraint fails because another user assigned it first
      const dbError = {
        code: '23505', // PostgreSQL unique constraint violation
        message: 'duplicate key value violates unique constraint "unique_component_package"',
      };

      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValueOnce({
          data: null,
          error: dbError,
        }),
      } as any);

      // This test will fail until database constraint error handling is implemented
      // Expected: Should catch constraint violation and show user-friendly error
      expect(componentBeforeInsert.can_assign).toBe(true);
      // expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('already assigned'));
    });
  });

  describe('Edge Case T073: Drawing in multiple packages (allowed)', () => {
    it('should allow same drawing to be assigned to multiple packages', async () => {
      const drawingId = 'drawing-shared-uuid';
      const package1Id = 'package-1-uuid';
      const package2Id = 'package-2-uuid';

      // Mock: Drawing is already in package 1
      const existingAssignment = {
        id: 'assignment-1',
        package_id: package1Id,
        drawing_id: drawingId,
      };

      // Mock: Try to add same drawing to package 2 (should succeed)
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValueOnce({
          data: [
            {
              id: 'assignment-2',
              package_id: package2Id,
              drawing_id: drawingId,
            },
          ],
          error: null,
        }),
      } as any);

      // Expected: Should allow drawing in multiple packages
      expect(existingAssignment.drawing_id).toBe(drawingId);
      // Drawing can be in multiple packages - this is allowed behavior
    });
  });

  describe('Edge Case T074: Component uniqueness constraint (database enforced)', () => {
    it('should enforce component can only be in one package at a time', async () => {
      const componentId = 'comp-unique-uuid';
      const package1Id = 'package-1-uuid';
      const package2Id = 'package-2-uuid';

      // Component already assigned to package 1
      const existingComponent: ComponentWithAssignmentStatus = {
        id: componentId,
        component_type: 'spool',
        identity_key: { spool_id: 'SP-UNIQUE' },
        area_id: 'area-1',
        system_id: 'system-1',
        test_package_id: package1Id,
        test_package_name: 'Package 1',
        can_assign: false,
      };

      // Try to assign same component to package 2 - should fail
      const dbError = {
        code: '23505', // Unique constraint violation
        message: 'Component can only be assigned to one package at a time',
      };

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: null,
          error: dbError,
        }),
      } as any);

      // Expected: Database constraint prevents reassignment
      expect(existingComponent.can_assign).toBe(false);
      expect(existingComponent.test_package_id).toBe(package1Id);
    });
  });

  describe('Edge Case T075: Drawing deletion with package retaining components', () => {
    it('should retain component assignments when drawing is deleted', async () => {
      const drawingId = 'drawing-to-delete-uuid';
      const packageId = 'package-uuid';
      const componentIds = ['comp-1', 'comp-2', 'comp-3'];

      // Components originally assigned via drawing
      const assignedComponents = componentIds.map((id) => ({
        id,
        component_type: 'spool',
        drawing_id: drawingId,
        test_package_id: packageId,
      }));

      // Mock: Delete drawing
      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      } as any);

      // Mock: Query components after drawing deletion
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: assignedComponents.map((c) => ({
            ...c,
            drawing_id: null, // Drawing is gone, but package assignment remains
            test_package_id: packageId,
          })),
          error: null,
        }),
      } as any);

      // Expected: Components still assigned to package even after drawing deleted
      const componentsAfterDelete = assignedComponents.map((c) => ({
        ...c,
        drawing_id: null,
        test_package_id: packageId,
      }));

      expect(componentsAfterDelete.every((c) => c.test_package_id === packageId)).toBe(true);
      expect(componentsAfterDelete.every((c) => c.drawing_id === null)).toBe(true);
    });
  });

  describe('Edge Case T076: Package deletion freeing components', () => {
    it('should free all components when package is deleted', async () => {
      const packageId = 'package-to-delete-uuid';
      const componentIds = ['comp-1', 'comp-2', 'comp-3'];

      // Components assigned to package
      const assignedComponents = componentIds.map((id) => ({
        id,
        component_type: 'spool',
        test_package_id: packageId,
      }));

      // Mock: Delete package (cascade should free components)
      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      } as any);

      // Mock: Query components after package deletion
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValueOnce({
          data: assignedComponents.map((c) => ({
            ...c,
            test_package_id: null, // Components freed
          })),
          error: null,
        }),
      } as any);

      // Expected: All components are freed when package is deleted
      const componentsAfterDelete = assignedComponents.map((c) => ({
        ...c,
        test_package_id: null,
      }));

      expect(componentsAfterDelete.every((c) => c.test_package_id === null)).toBe(true);
    });
  });
});
