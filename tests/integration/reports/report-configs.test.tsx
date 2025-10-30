/**
 * Integration tests for report configuration save/load workflow (Feature 019 - T071)
 * Tests end-to-end flow: create config → save → load → verify parameters restored
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  useReportConfigs,
  useCreateReportConfig,
  useUpdateReportConfig,
  useDeleteReportConfig,
} from '@/hooks/useReportConfigs';
import type { CreateReportConfigInput, UpdateReportConfigInput } from '@/types/reports';

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return Wrapper;
}

// Test project ID (assumes test data exists)
const TEST_PROJECT_ID = 'test-project-save-load';

describe('Report Configuration Save/Load Workflow', () => {
  beforeEach(async () => {
    // Clean up any existing test configs
    await supabase
      .from('report_configs')
      .delete()
      .eq('project_id', TEST_PROJECT_ID);
  });

  describe('Create and Load Configuration', () => {
    it('saves a new configuration and retrieves it correctly', async () => {
      const wrapper = createWrapper();

      // Step 1: Create a new configuration
      const { result: createResult } = renderHook(() => useCreateReportConfig(), { wrapper });

      const newConfig: CreateReportConfigInput = {
        projectId: TEST_PROJECT_ID,
        name: 'Weekly Area Report',
        description: 'Standard weekly progress grouped by area',
        groupingDimension: 'area',
        hierarchicalGrouping: false,
        componentTypeFilter: null,
      };

      let createdConfigId: string | undefined;

      await waitFor(async () => {
        const created = await createResult.current.mutateAsync(newConfig);
        createdConfigId = created.id;
        expect(created.name).toBe('Weekly Area Report');
        expect(created.groupingDimension).toBe('area');
      });

      expect(createdConfigId).toBeDefined();

      // Step 2: Load configurations and verify the saved config appears
      const { result: loadResult } = renderHook(
        () => useReportConfigs(TEST_PROJECT_ID),
        { wrapper }
      );

      await waitFor(() => {
        expect(loadResult.current.isSuccess).toBe(true);
      });

      const configs = loadResult.current.data;
      expect(configs).toBeDefined();
      expect(configs?.length).toBeGreaterThan(0);

      const savedConfig = configs?.find((c) => c.id === createdConfigId);
      expect(savedConfig).toBeDefined();
      expect(savedConfig?.name).toBe('Weekly Area Report');
      expect(savedConfig?.description).toBe('Standard weekly progress grouped by area');
      expect(savedConfig?.groupingDimension).toBe('area');
      expect(savedConfig?.hierarchicalGrouping).toBe(false);
      expect(savedConfig?.componentTypeFilter).toBeNull();
    });

    it('saves configuration without description', async () => {
      const wrapper = createWrapper();

      const { result: createResult } = renderHook(() => useCreateReportConfig(), { wrapper });

      const newConfig: CreateReportConfigInput = {
        projectId: TEST_PROJECT_ID,
        name: 'System Progress',
        groupingDimension: 'system',
      };

      let createdConfigId: string | undefined;

      await waitFor(async () => {
        const created = await createResult.current.mutateAsync(newConfig);
        createdConfigId = created.id;
        expect(created.description).toBeUndefined();
      });

      // Verify loaded config has no description
      const { result: loadResult } = renderHook(
        () => useReportConfigs(TEST_PROJECT_ID),
        { wrapper }
      );

      await waitFor(() => {
        const savedConfig = loadResult.current.data?.find((c) => c.id === createdConfigId);
        expect(savedConfig?.description).toBeUndefined();
      });
    });

    it('saves configuration with component type filter', async () => {
      const wrapper = createWrapper();

      const { result: createResult } = renderHook(() => useCreateReportConfig(), { wrapper });

      const newConfig: CreateReportConfigInput = {
        projectId: TEST_PROJECT_ID,
        name: 'Pipe Only Report',
        description: 'Progress for pipe components only',
        groupingDimension: 'area',
        componentTypeFilter: ['PIPE'],
      };

      let createdConfigId: string | undefined;

      await waitFor(async () => {
        const created = await createResult.current.mutateAsync(newConfig);
        createdConfigId = created.id;
        expect(created.componentTypeFilter).toEqual(['PIPE']);
      });

      // Verify loaded config has correct filter
      const { result: loadResult } = renderHook(
        () => useReportConfigs(TEST_PROJECT_ID),
        { wrapper }
      );

      await waitFor(() => {
        const savedConfig = loadResult.current.data?.find((c) => c.id === createdConfigId);
        expect(savedConfig?.componentTypeFilter).toEqual(['PIPE']);
      });
    });
  });

  describe('Update Configuration', () => {
    it('updates configuration name and description', async () => {
      const wrapper = createWrapper();

      // Create initial config
      const { result: createResult } = renderHook(() => useCreateReportConfig(), { wrapper });

      const newConfig: CreateReportConfigInput = {
        projectId: TEST_PROJECT_ID,
        name: 'Initial Name',
        description: 'Initial description',
        groupingDimension: 'area',
      };

      let configId: string | undefined;

      await waitFor(async () => {
        const created = await createResult.current.mutateAsync(newConfig);
        configId = created.id;
      });

      expect(configId).toBeDefined();

      // Update config
      const { result: updateResult } = renderHook(() => useUpdateReportConfig(), { wrapper });

      const updates: UpdateReportConfigInput = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      await waitFor(async () => {
        const updated = await updateResult.current.mutateAsync({
          id: configId!,
          ...updates,
        });
        expect(updated.name).toBe('Updated Name');
        expect(updated.description).toBe('Updated description');
      });

      // Verify updates persisted
      const { result: loadResult } = renderHook(
        () => useReportConfigs(TEST_PROJECT_ID),
        { wrapper }
      );

      await waitFor(() => {
        const savedConfig = loadResult.current.data?.find((c) => c.id === configId);
        expect(savedConfig?.name).toBe('Updated Name');
        expect(savedConfig?.description).toBe('Updated description');
      });
    });

    it('updates grouping dimension', async () => {
      const wrapper = createWrapper();

      // Create initial config
      const { result: createResult } = renderHook(() => useCreateReportConfig(), { wrapper });

      const newConfig: CreateReportConfigInput = {
        projectId: TEST_PROJECT_ID,
        name: 'Dimension Test',
        groupingDimension: 'area',
      };

      let configId: string | undefined;

      await waitFor(async () => {
        const created = await createResult.current.mutateAsync(newConfig);
        configId = created.id;
      });

      // Update dimension to system
      const { result: updateResult } = renderHook(() => useUpdateReportConfig(), { wrapper });

      await waitFor(async () => {
        const updated = await updateResult.current.mutateAsync({
          id: configId!,
          groupingDimension: 'system',
        });
        expect(updated.groupingDimension).toBe('system');
      });

      // Verify dimension updated
      const { result: loadResult } = renderHook(
        () => useReportConfigs(TEST_PROJECT_ID),
        { wrapper }
      );

      await waitFor(() => {
        const savedConfig = loadResult.current.data?.find((c) => c.id === configId);
        expect(savedConfig?.groupingDimension).toBe('system');
      });
    });

    it('updates updated_at timestamp on modification', async () => {
      const wrapper = createWrapper();

      // Create config
      const { result: createResult } = renderHook(() => useCreateReportConfig(), { wrapper });

      const newConfig: CreateReportConfigInput = {
        projectId: TEST_PROJECT_ID,
        name: 'Timestamp Test',
        groupingDimension: 'area',
      };

      let configId: string | undefined;
      let initialUpdatedAt: Date | undefined;

      await waitFor(async () => {
        const created = await createResult.current.mutateAsync(newConfig);
        configId = created.id;
        initialUpdatedAt = created.updatedAt;
      });

      // Wait 1 second to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update config
      const { result: updateResult } = renderHook(() => useUpdateReportConfig(), { wrapper });

      await waitFor(async () => {
        const updated = await updateResult.current.mutateAsync({
          id: configId!,
          name: 'Updated Timestamp Test',
        });

        // Verify updated_at changed
        expect(updated.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt!.getTime());
      });
    });
  });

  describe('Delete Configuration', () => {
    it('deletes configuration successfully', async () => {
      const wrapper = createWrapper();

      // Create config
      const { result: createResult } = renderHook(() => useCreateReportConfig(), { wrapper });

      const newConfig: CreateReportConfigInput = {
        projectId: TEST_PROJECT_ID,
        name: 'Config to Delete',
        groupingDimension: 'area',
      };

      let configId: string | undefined;

      await waitFor(async () => {
        const created = await createResult.current.mutateAsync(newConfig);
        configId = created.id;
      });

      // Verify config exists
      const { result: loadResult1 } = renderHook(
        () => useReportConfigs(TEST_PROJECT_ID),
        { wrapper }
      );

      await waitFor(() => {
        const configs = loadResult1.current.data;
        expect(configs?.find((c) => c.id === configId)).toBeDefined();
      });

      // Delete config
      const { result: deleteResult } = renderHook(() => useDeleteReportConfig(), { wrapper });

      await waitFor(async () => {
        await deleteResult.current.mutateAsync({ id: configId! });
      });

      // Verify config no longer exists
      const { result: loadResult2 } = renderHook(
        () => useReportConfigs(TEST_PROJECT_ID),
        { wrapper: createWrapper() } // New wrapper to force refetch
      );

      await waitFor(() => {
        const configs = loadResult2.current.data;
        expect(configs?.find((c) => c.id === configId)).toBeUndefined();
      });
    });
  });

  describe('Multiple Configurations', () => {
    it('loads multiple configurations ordered by updated_at descending', async () => {
      const wrapper = createWrapper();

      const { result: createResult } = renderHook(() => useCreateReportConfig(), { wrapper });

      // Create multiple configs with delays to ensure different timestamps
      const config1: CreateReportConfigInput = {
        projectId: TEST_PROJECT_ID,
        name: 'First Config',
        groupingDimension: 'area',
      };

      await waitFor(async () => {
        await createResult.current.mutateAsync(config1);
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const config2: CreateReportConfigInput = {
        projectId: TEST_PROJECT_ID,
        name: 'Second Config',
        groupingDimension: 'system',
      };

      await waitFor(async () => {
        await createResult.current.mutateAsync(config2);
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const config3: CreateReportConfigInput = {
        projectId: TEST_PROJECT_ID,
        name: 'Third Config',
        groupingDimension: 'test_package',
      };

      await waitFor(async () => {
        await createResult.current.mutateAsync(config3);
      });

      // Load all configs
      const { result: loadResult } = renderHook(
        () => useReportConfigs(TEST_PROJECT_ID),
        { wrapper }
      );

      await waitFor(() => {
        const configs = loadResult.current.data;
        expect(configs?.length).toBe(3);

        // Most recently updated should be first
        expect(configs?.[0].name).toBe('Third Config');
        expect(configs?.[1].name).toBe('Second Config');
        expect(configs?.[2].name).toBe('First Config');
      });
    });

    it('only loads configurations for specified project', async () => {
      const wrapper = createWrapper();

      const { result: createResult } = renderHook(() => useCreateReportConfig(), { wrapper });

      // Create config for test project
      const config1: CreateReportConfigInput = {
        projectId: TEST_PROJECT_ID,
        name: 'Test Project Config',
        groupingDimension: 'area',
      };

      await waitFor(async () => {
        await createResult.current.mutateAsync(config1);
      });

      // Create config for different project
      const config2: CreateReportConfigInput = {
        projectId: 'different-project',
        name: 'Different Project Config',
        groupingDimension: 'system',
      };

      await waitFor(async () => {
        await createResult.current.mutateAsync(config2);
      });

      // Load configs for test project only
      const { result: loadResult } = renderHook(
        () => useReportConfigs(TEST_PROJECT_ID),
        { wrapper }
      );

      await waitFor(() => {
        const configs = loadResult.current.data;
        expect(configs?.length).toBe(1);
        expect(configs?.[0].name).toBe('Test Project Config');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles duplicate config names with unique constraint error', async () => {
      const wrapper = createWrapper();

      const { result: createResult } = renderHook(() => useCreateReportConfig(), { wrapper });

      const config: CreateReportConfigInput = {
        projectId: TEST_PROJECT_ID,
        name: 'Duplicate Name Test',
        groupingDimension: 'area',
      };

      // Create first config
      await waitFor(async () => {
        await createResult.current.mutateAsync(config);
      });

      // Try to create duplicate (should fail due to unique constraint)
      await expect(async () => {
        await createResult.current.mutateAsync(config);
      }).rejects.toThrow();
    });

    it('handles update of non-existent config', async () => {
      const wrapper = createWrapper();

      const { result: updateResult } = renderHook(() => useUpdateReportConfig(), { wrapper });

      // Try to update non-existent config
      await expect(async () => {
        await updateResult.current.mutateAsync({
          id: 'non-existent-id',
          name: 'Updated Name',
        });
      }).rejects.toThrow();
    });

    it('handles delete of non-existent config', async () => {
      const wrapper = createWrapper();

      const { result: deleteResult } = renderHook(() => useDeleteReportConfig(), { wrapper });

      // Try to delete non-existent config (should not throw, just succeed)
      await waitFor(async () => {
        await deleteResult.current.mutateAsync({ id: 'non-existent-id' });
      });

      // Should complete without error (DELETE is idempotent)
      expect(deleteResult.current.isSuccess).toBe(true);
    });
  });

  describe('Cache Invalidation', () => {
    it('invalidates cache after create', async () => {
      const wrapper = createWrapper();

      const { result: createResult } = renderHook(() => useCreateReportConfig(), { wrapper });
      const { result: loadResult } = renderHook(
        () => useReportConfigs(TEST_PROJECT_ID),
        { wrapper }
      );

      // Wait for initial load
      await waitFor(() => {
        expect(loadResult.current.isSuccess).toBe(true);
      });

      const initialCount = loadResult.current.data?.length ?? 0;

      // Create new config
      const newConfig: CreateReportConfigInput = {
        projectId: TEST_PROJECT_ID,
        name: 'Cache Test Config',
        groupingDimension: 'area',
      };

      await waitFor(async () => {
        await createResult.current.mutateAsync(newConfig);
      });

      // Cache should be invalidated and refetched
      await waitFor(() => {
        expect(loadResult.current.data?.length).toBe(initialCount + 1);
      });
    });
  });
});
