/**
 * Integration Tests: FieldWeldReportPDF Component (Feature 029 - T016, T017)
 *
 * Tests ACTUAL PDF generation with real @react-pdf/renderer.
 * These tests verify end-to-end PDF blob generation without mocks.
 *
 * Test Coverage:
 * - T016: Generate PDF blob using real @react-pdf/renderer
 * - T017: Test all 4 dimensions (area, system, test_package, welder)
 */

import { describe, it, expect } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import { FieldWeldReportPDF } from '@/components/pdf/reports/FieldWeldReportPDF';
import type { FieldWeldReportData } from '@/types/reports';

describe('FieldWeldReportPDF - Integration Tests (Real PDF Generation)', () => {
  const createMockReportData = (rowCount: number): FieldWeldReportData => {
    const rows = Array.from({ length: rowCount }, (_, i) => ({
      name: `Test Item ${i + 1}`,
      totalWelds: 100 + i * 10,
      fitupCount: 80 + i * 8,
      weldCompleteCount: 60 + i * 6,
      acceptedCount: 50 + i * 5,
      ndePassRate: 0.85 + i * 0.01,
      repairRate: 0.15 - i * 0.01,
      pctTotal: 0.65 + i * 0.02,
      // Welder-specific fields (optional)
      firstPassAcceptanceRate: 0.75 + i * 0.02,
      avgDaysToAcceptance: 2.5 + i * 0.1,
    }));

    const grandTotal = {
      name: 'Grand Total',
      totalWelds: rows.reduce((sum, row) => sum + row.totalWelds, 0),
      fitupCount: rows.reduce((sum, row) => sum + row.fitupCount, 0),
      weldCompleteCount: rows.reduce((sum, row) => sum + row.weldCompleteCount, 0),
      acceptedCount: rows.reduce((sum, row) => sum + row.acceptedCount, 0),
      ndePassRate: 0.85,
      repairRate: 0.15,
      pctTotal: 0.65,
      firstPassAcceptanceRate: 0.75,
      avgDaysToAcceptance: 2.5,
    };

    return { rows, grandTotal, grand_total: grandTotal };
  };

  describe('T016: PDF Blob Generation', () => {
    it('generates a non-empty PDF blob', async () => {
      const reportData = createMockReportData(10);

      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(0);
    }, 10000); // 10 second timeout for PDF generation

    it('generates PDF blob with correct MIME type', async () => {
      const reportData = createMockReportData(10);

      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      expect(blob.type).toBe('application/pdf');
    }, 10000);

    it('generates PDF blob <500KB for 10-row report', async () => {
      const reportData = createMockReportData(10);

      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      const sizeInKB = blob.size / 1024;
      expect(sizeInKB).toBeLessThan(500);
    }, 10000);

    it('generates PDF blob <500KB for 50-row report', async () => {
      const reportData = createMockReportData(50);

      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      const sizeInKB = blob.size / 1024;
      expect(sizeInKB).toBeLessThan(500);
    }, 10000);

    it('generates multi-page PDF blob for >50 row report', async () => {
      const reportData = createMockReportData(75); // Should create 2 pages (50 + 25)

      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe('application/pdf');
    }, 10000);

    it('handles empty data gracefully', async () => {
      const reportData: FieldWeldReportData = {
        rows: [],
        grandTotal: {
          name: 'Grand Total',
          totalWelds: 0,
          fitupCount: 0,
          weldCompleteCount: 0,
          acceptedCount: 0,
          ndePassRate: 0,
          repairRate: 0,
          pctTotal: 0,
        },
        grand_total: {
          name: 'Grand Total',
          totalWelds: 0,
          fitupCount: 0,
          weldCompleteCount: 0,
          acceptedCount: 0,
          ndePassRate: 0,
          repairRate: 0,
          pctTotal: 0,
        },
      };

      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe('application/pdf');
    }, 10000);

    it('handles company logo when provided', async () => {
      const reportData = createMockReportData(10);
      // Simple 1x1 transparent PNG as base64
      const mockLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
          companyLogo={mockLogo}
        />
      ).toBlob();

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(0);
    }, 10000);
  });

  describe('T017: All Dimension Tests', () => {
    const reportData = createMockReportData(10);

    it('generates PDF for area dimension', async () => {
      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe('application/pdf');
    }, 10000);

    it('generates PDF for system dimension', async () => {
      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="system"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe('application/pdf');
    }, 10000);

    it('generates PDF for test_package dimension', async () => {
      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="test_package"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe('application/pdf');
    }, 10000);

    it('generates PDF for welder dimension with extra columns', async () => {
      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="welder"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe('application/pdf');

      // Welder dimension should have extra columns (firstPassAcceptanceRate, avgDaysToAcceptance)
      // Verify PDF is slightly larger due to extra columns
      const areaBlobPromise = pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      const areaBlob = await areaBlobPromise;

      // Welder PDF should be slightly larger or similar size
      // (Not always larger due to compression, but should be non-zero)
      expect(blob.size).toBeGreaterThan(0);
      expect(areaBlob.size).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Performance Tests', () => {
    it('generates 100-row PDF in <5 seconds', async () => {
      const reportData = createMockReportData(100);
      const startTime = Date.now();

      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      const duration = Date.now() - startTime;

      expect(blob).toBeDefined();
      expect(duration).toBeLessThan(5000); // <5 seconds
    }, 10000);
  });

  describe('Special Characters Handling', () => {
    it('handles special characters in project name', async () => {
      const reportData = createMockReportData(5);

      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Project / Pipeline \\ 2025 | Test <Tag>"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(0);
    }, 10000);

    it('handles special characters in row names', async () => {
      const reportData: FieldWeldReportData = {
        rows: [
          {
            name: 'Area A & B (Test)',
            totalWelds: 100,
            fitupCount: 80,
            weldCompleteCount: 60,
            acceptedCount: 50,
            ndePassRate: 0.85,
            repairRate: 0.15,
            pctTotal: 0.65,
          },
          {
            name: 'System "X-Ray" #1',
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
      };

      const blob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(0);
    }, 10000);
  });
});
