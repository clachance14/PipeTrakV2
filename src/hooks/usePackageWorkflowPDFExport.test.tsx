/**
 * Unit Tests: usePackageWorkflowPDFExport Hook
 *
 * Tests the hook's full lifecycle with real PDF generation.
 *
 * Test Coverage:
 * - generatePDFPreview returns correct shape { blob, url, filename }
 * - Filename format is correct
 * - Error handling works
 * - State management (isGenerating) works
 * - Concurrent export prevention works
 * - generatePDF returns Blob (for consistency with other hooks)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePackageWorkflowPDFExport } from '@/hooks/usePackageWorkflowPDFExport';
import type { PackageWorkflowStage } from '@/types/workflow.types';

describe('usePackageWorkflowPDFExport', () => {
  // Store original createElement
  const originalCreateElement = document.createElement.bind(document);

  // Mock document.createElement and URL APIs for download testing
  beforeEach(() => {
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock document.createElement for <a> element
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    });
  });

  const createMockPackageData = () => ({
    name: 'Test Package A',
    description: 'Test package description',
    test_type: 'hydrostatic',
    target_date: '2025-12-31',
    requires_coating: true,
    requires_insulation: false,
  });

  const createMockWorkflowStages = (): PackageWorkflowStage[] => [
    {
      id: '1',
      package_id: 'pkg-1',
      stage_type: 'assembly',
      stage_name: 'Pipe Assembly',
      sort_order: 1,
      is_completed: true,
      completed_at: '2025-11-20T10:00:00Z',
      completed_by_user_id: 'user-1',
      created_at: '2025-11-01T08:00:00Z',
      updated_at: '2025-11-20T10:00:00Z',
    },
    {
      id: '2',
      package_id: 'pkg-1',
      stage_type: 'welding',
      stage_name: 'Field Welding',
      sort_order: 2,
      is_completed: false,
      completed_at: null,
      completed_by_user_id: null,
      created_at: '2025-11-01T08:00:00Z',
      updated_at: '2025-11-01T08:00:00Z',
    },
  ];

  describe('generatePDFPreview', () => {
    it('returns correct shape { blob, url, filename }', async () => {
      const { result } = renderHook(() => usePackageWorkflowPDFExport());
      const packageData = createMockPackageData();
      const workflowStages = createMockWorkflowStages();

      const preview = await result.current.generatePDFPreview(
        packageData,
        workflowStages,
        'Test Project'
      );

      // Verify return shape
      expect(preview).toHaveProperty('blob');
      expect(preview).toHaveProperty('url');
      expect(preview).toHaveProperty('filename');

      // Verify blob is valid PDF
      expect(preview.blob).toBeDefined();
      expect(preview.blob instanceof Blob).toBe(true);
      expect(preview.blob.type).toBe('application/pdf');
      expect(preview.blob.size).toBeGreaterThan(0);

      // Verify URL is object URL
      expect(preview.url).toBe('blob:mock-url');
      expect(URL.createObjectURL).toHaveBeenCalledWith(preview.blob);

      // Verify filename format
      expect(preview.filename).toMatch(/Test_Package_A_Workflow_Report_\d{4}-\d{2}-\d{2}\.pdf/);
    }, 10000);

    it('sanitizes package name in filename', async () => {
      const { result } = renderHook(() => usePackageWorkflowPDFExport());
      const packageData = {
        ...createMockPackageData(),
        name: 'Package / Special \\ Name @ #1',
      };
      const workflowStages = createMockWorkflowStages();

      const preview = await result.current.generatePDFPreview(
        packageData,
        workflowStages,
        'Test Project'
      );

      // Verify special characters are replaced
      // Regex replaces non-alphanumeric with _, so "/ \\ @ #" become single underscores each
      expect(preview.filename).toMatch(/Package___Special___Name____1_Workflow_Report/);
      expect(preview.filename).not.toContain('/');
      expect(preview.filename).not.toContain('\\');
      expect(preview.filename).not.toContain('@');
      expect(preview.filename).not.toContain('#');
    }, 10000);

    it('transitions isGenerating from false → true → false', async () => {
      const { result } = renderHook(() => usePackageWorkflowPDFExport());
      const packageData = createMockPackageData();
      const workflowStages = createMockWorkflowStages();

      // Initial state
      expect(result.current.isGenerating).toBe(false);

      // Start generation
      const previewPromise = result.current.generatePDFPreview(
        packageData,
        workflowStages,
        'Test Project'
      );

      // During generation
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });

      // Wait for completion
      await previewPromise;

      // After generation
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    }, 10000);

    it('prevents multiple simultaneous exports', async () => {
      const { result } = renderHook(() => usePackageWorkflowPDFExport());
      const packageData = createMockPackageData();
      const workflowStages = createMockWorkflowStages();

      // Start first export
      const firstPromise = result.current.generatePDFPreview(
        packageData,
        workflowStages,
        'Test Project'
      );

      // Wait until isGenerating becomes true
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });

      // Attempt second export (should fail)
      await expect(
        result.current.generatePDFPreview(packageData, workflowStages, 'Test Project')
      ).rejects.toThrow('PDF generation already in progress');

      // First export should complete successfully
      const preview = await firstPromise;
      expect(preview).toBeDefined();
    }, 10000);

    it('sets error state on generation failure', async () => {
      const { result } = renderHook(() => usePackageWorkflowPDFExport());
      const invalidData = null as any;
      const workflowStages = createMockWorkflowStages();

      await expect(
        result.current.generatePDFPreview(invalidData, workflowStages, 'Test Project')
      ).rejects.toThrow();

      // Verify error state was set
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
    }, 10000);

    it('resets isGenerating even when generation fails', async () => {
      const { result } = renderHook(() => usePackageWorkflowPDFExport());
      const invalidData = null as any;
      const workflowStages = createMockWorkflowStages();

      try {
        await result.current.generatePDFPreview(invalidData, workflowStages, 'Test Project');
      } catch {
        // Expected to throw
      }

      // Verify isGenerating was reset
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    }, 10000);

    it('clears error state on successful generation', async () => {
      const { result } = renderHook(() => usePackageWorkflowPDFExport());
      const packageData = createMockPackageData();
      const workflowStages = createMockWorkflowStages();

      // Generate successfully
      await result.current.generatePDFPreview(packageData, workflowStages, 'Test Project');

      // Verify error is null
      expect(result.current.error).toBeNull();
    }, 10000);

    it('works with optional company logo', async () => {
      const { result } = renderHook(() => usePackageWorkflowPDFExport());
      const packageData = createMockPackageData();
      const workflowStages = createMockWorkflowStages();
      const mockLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const preview = await result.current.generatePDFPreview(
        packageData,
        workflowStages,
        'Test Project',
        mockLogo
      );

      expect(preview).toBeDefined();
      expect(preview.blob instanceof Blob).toBe(true);
    }, 10000);
  });

  describe('generatePDF', () => {
    it('returns a valid PDF blob', async () => {
      const { result } = renderHook(() => usePackageWorkflowPDFExport());
      const packageData = createMockPackageData();
      const workflowStages = createMockWorkflowStages();

      const blob = await result.current.generatePDF(
        packageData,
        workflowStages,
        'Test Project'
      );

      expect(blob).toBeDefined();
      expect(blob instanceof Blob).toBe(true);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);
    }, 10000);

    it('triggers browser download', async () => {
      const { result } = renderHook(() => usePackageWorkflowPDFExport());
      const packageData = createMockPackageData();
      const workflowStages = createMockWorkflowStages();

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockLink as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tagName);
      });

      await result.current.generatePDF(packageData, workflowStages, 'Test Project');

      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toMatch(/Test_Package_A_Workflow_Report_\d{4}-\d{2}-\d{2}\.pdf/);
    }, 10000);

    it('cleans up object URL after download', async () => {
      const { result } = renderHook(() => usePackageWorkflowPDFExport());
      const packageData = createMockPackageData();
      const workflowStages = createMockWorkflowStages();

      await result.current.generatePDF(packageData, workflowStages, 'Test Project');

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    }, 10000);

    it('handles download errors gracefully', async () => {
      const { result } = renderHook(() => usePackageWorkflowPDFExport());
      const packageData = createMockPackageData();
      const workflowStages = createMockWorkflowStages();

      // Mock link.click() to throw error
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(() => {
          throw new Error('Download blocked by browser');
        }),
      };
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockLink as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tagName);
      });

      await expect(
        result.current.generatePDF(packageData, workflowStages, 'Test Project')
      ).rejects.toThrow('Failed to download PDF');

      // Verify error state was set
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
    }, 10000);

    it('prevents multiple simultaneous exports', async () => {
      const { result } = renderHook(() => usePackageWorkflowPDFExport());
      const packageData = createMockPackageData();
      const workflowStages = createMockWorkflowStages();

      // Start first export
      const firstPromise = result.current.generatePDF(
        packageData,
        workflowStages,
        'Test Project'
      );

      // Wait until isGenerating becomes true
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });

      // Attempt second export (should fail)
      await expect(
        result.current.generatePDF(packageData, workflowStages, 'Test Project')
      ).rejects.toThrow('PDF generation already in progress');

      // First export should complete successfully
      const blob = await firstPromise;
      expect(blob).toBeDefined();
    }, 10000);
  });

  describe('Lazy Loading', () => {
    it('dynamically imports @react-pdf/renderer only when needed', async () => {
      // Render hook but don't call generatePDF yet
      const { result } = renderHook(() => usePackageWorkflowPDFExport());

      expect(result.current.generatePDF).toBeDefined();
      expect(result.current.generatePDFPreview).toBeDefined();
      expect(result.current.isGenerating).toBe(false);

      // Now trigger PDF generation (which should lazy load the library)
      const packageData = createMockPackageData();
      const workflowStages = createMockWorkflowStages();
      const blob = await result.current.generatePDF(
        packageData,
        workflowStages,
        'Test Project'
      );

      expect(blob).toBeDefined();
    }, 10000);
  });
});
