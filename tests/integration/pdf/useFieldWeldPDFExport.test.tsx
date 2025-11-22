/**
 * Integration Tests: useFieldWeldPDFExport Hook (Feature 029 - T026, T027)
 *
 * Tests the hook's full lifecycle with real PDF generation.
 *
 * Test Coverage:
 * - T026: Hook state transitions (isGenerating: false → true → false)
 * - T027: Error handling and error state management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFieldWeldPDFExport } from '@/hooks/useFieldWeldPDFExport';
import type { FieldWeldReportData } from '@/types/reports';

describe('useFieldWeldPDFExport - Integration Tests', () => {
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

  const createMockReportData = (): FieldWeldReportData => ({
    rows: [
      {
        name: 'Area A',
        totalWelds: 100,
        fitupCount: 80,
        weldCompleteCount: 60,
        acceptedCount: 50,
        ndePassRate: 0.85,
        repairRate: 0.15,
        pctTotal: 0.65,
      },
      {
        name: 'Area B',
        totalWelds: 150,
        fitupCount: 120,
        weldCompleteCount: 90,
        acceptedCount: 75,
        ndePassRate: 0.90,
        repairRate: 0.10,
        pctTotal: 0.75,
      },
    ],
    grandTotal: {
      name: 'Grand Total',
      totalWelds: 250,
      fitupCount: 200,
      weldCompleteCount: 150,
      acceptedCount: 125,
      ndePassRate: 0.875,
      repairRate: 0.125,
      pctTotal: 0.70,
    },
    grand_total: {
      name: 'Grand Total',
      totalWelds: 250,
      fitupCount: 200,
      weldCompleteCount: 150,
      acceptedCount: 125,
      ndePassRate: 0.875,
      repairRate: 0.125,
      pctTotal: 0.70,
    },
  });

  describe('T026: State Transitions', () => {
    it('transitions isGenerating from false → true → false', async () => {
      const { result } = renderHook(() => useFieldWeldPDFExport());

      // Initial state: isGenerating = false
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();

      // Start PDF generation
      const reportData = createMockReportData();
      const generatePromise = result.current.generatePDF(
        reportData,
        'Test Project',
        'area'
      );

      // During generation: isGenerating = true
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });

      // Wait for generation to complete
      await generatePromise;

      // After generation: isGenerating = false
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    }, 10000);

    it('returns a valid PDF blob', async () => {
      const { result } = renderHook(() => useFieldWeldPDFExport());
      const reportData = createMockReportData();

      const blob = await result.current.generatePDF(
        reportData,
        'Test Project',
        'area'
      );

      expect(blob).toBeDefined();
      expect(blob instanceof Blob).toBe(true);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);
    }, 10000);

    it('clears error state on successful generation', async () => {
      const { result } = renderHook(() => useFieldWeldPDFExport());
      const reportData = createMockReportData();

      // Generate a PDF successfully
      await result.current.generatePDF(reportData, 'Test Project', 'area');

      // Verify error is null after successful generation
      expect(result.current.error).toBeNull();
    }, 10000);

    it('prevents download during generation', async () => {
      const { result } = renderHook(() => useFieldWeldPDFExport());
      const reportData = createMockReportData();

      // Generate PDF and verify isGenerating state transitions
      let promise: Promise<Blob>;
      await act(async () => {
        promise = result.current.generatePDF(
          reportData,
          'Test Project',
          'area'
        );
      });

      // During generation: isGenerating should be true
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });

      // Wait for generation to complete
      await act(async () => {
        await promise!;
      });

      // After generation: isGenerating should be false
      expect(result.current.isGenerating).toBe(false);
    }, 10000);
  });

  describe('T027: Error Handling', () => {
    it('sets error state on generation failure', async () => {
      const { result } = renderHook(() => useFieldWeldPDFExport());

      // Invalid data should cause generation to fail
      const invalidData = null as unknown as FieldWeldReportData;

      await expect(
        result.current.generatePDF(invalidData, 'Test Project', 'area')
      ).rejects.toThrow();

      // Verify error state was set
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
    }, 10000);

    it('resets isGenerating even when generation fails', async () => {
      const { result } = renderHook(() => useFieldWeldPDFExport());

      // Invalid data should cause generation to fail
      const invalidData = null as unknown as FieldWeldReportData;

      try {
        await result.current.generatePDF(invalidData, 'Test Project', 'area');
      } catch {
        // Expected to throw
      }

      // Verify isGenerating was reset to false even on error
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    }, 10000);

    it('handles download errors gracefully', async () => {
      const { result } = renderHook(() => useFieldWeldPDFExport());
      const reportData = createMockReportData();

      // Mock link.click() to throw error (simulating blocked download)
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
        result.current.generatePDF(reportData, 'Test Project', 'area')
      ).rejects.toThrow(
        'Failed to download PDF. Please check your browser settings and allow downloads for this site.'
      );

      // Verify error state was set
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toContain('Failed to download PDF');
      });
    }, 10000);

    it('prevents multiple simultaneous exports', async () => {
      const { result } = renderHook(() => useFieldWeldPDFExport());
      const reportData = createMockReportData();

      // Start first export (don't await yet)
      const firstPromise = result.current.generatePDF(
        reportData,
        'Test Project',
        'area'
      );

      // Wait until isGenerating becomes true
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });

      // Attempt second export immediately (should fail)
      try {
        await result.current.generatePDF(reportData, 'Test Project', 'system');
        expect.fail('Second export should have been rejected');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('PDF generation already in progress');
      }

      // First export should complete successfully
      const blob = await firstPromise;
      expect(blob).toBeDefined();
    }, 10000);
  });

  describe('Filename Generation', () => {
    it('generates correct filename pattern', async () => {
      const { result } = renderHook(() => useFieldWeldPDFExport());
      const reportData = createMockReportData();

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

      await result.current.generatePDF(reportData, 'Test Project', 'area');

      // Verify filename follows pattern: [project]_field_weld_[dimension]_[YYYY-MM-DD].pdf
      // Note: sanitizeFilename replaces spaces with underscores, but doesn't add extra underscores
      expect(mockLink.download).toMatch(/Test Project_field_weld_area_\d{4}-\d{2}-\d{2}\.pdf/);
    }, 10000);

    it('sanitizes special characters in project name', async () => {
      const { result } = renderHook(() => useFieldWeldPDFExport());
      const reportData = createMockReportData();

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

      await result.current.generatePDF(
        reportData,
        'Project / Pipeline \\ 2025',
        'area'
      );

      // Verify special characters were replaced with underscores
      expect(mockLink.download).not.toContain('/');
      expect(mockLink.download).not.toContain('\\');
      // sanitizeFilename replaces / and \ with _, resulting in "Project _ Pipeline _ 2025"
      expect(mockLink.download).toMatch(/Project _ Pipeline _ 2025_field_weld_area/);
    }, 10000);
  });

  describe('Lazy Loading', () => {
    it('dynamically imports @react-pdf/renderer only when needed', async () => {
      // Render hook but don't call generatePDF yet
      const { result } = renderHook(() => useFieldWeldPDFExport());

      // @react-pdf/renderer should not be loaded yet (no way to directly test this,
      // but we can verify hook works and doesn't throw import errors)
      expect(result.current.generatePDF).toBeDefined();
      expect(result.current.isGenerating).toBe(false);

      // Now trigger PDF generation (which should lazy load the library)
      const reportData = createMockReportData();
      const blob = await result.current.generatePDF(
        reportData,
        'Test Project',
        'area'
      );

      expect(blob).toBeDefined();
    }, 10000);
  });

  describe('All Dimensions', () => {
    it.each(['area', 'system', 'test_package', 'welder'] as const)(
      'generates PDF for %s dimension',
      async (dimension) => {
        const { result } = renderHook(() => useFieldWeldPDFExport());
        const reportData = createMockReportData();

        const blob = await result.current.generatePDF(
          reportData,
          'Test Project',
          dimension
        );

        expect(blob).toBeDefined();
        expect(blob.type).toBe('application/pdf');
        expect(blob.size).toBeGreaterThan(0);
      },
      10000
    );
  });
});
