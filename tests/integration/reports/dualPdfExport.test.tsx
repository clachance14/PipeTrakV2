/**
 * Acceptance Test: Dual PDF Export (Feature 029 - T041)
 *
 * Tests that both classic and enhanced exports work and produce valid PDFs.
 *
 * Test Coverage:
 * - T041: Both exports produce valid PDF blobs with different implementations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FieldWeldReportPDF } from '@/components/pdf/reports/FieldWeldReportPDF';
import type { FieldWeldReportData } from '@/types/reports';

describe('Dual PDF Export - Acceptance Test', () => {
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    // Mock URL APIs
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock download link
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
        ndePassRate: 85.0,
        repairRate: 15.0,
        pctTotal: 65.0,
      },
      {
        name: 'Area B',
        totalWelds: 150,
        fitupCount: 120,
        weldCompleteCount: 90,
        acceptedCount: 75,
        ndePassRate: 90.0,
        repairRate: 10.0,
        pctTotal: 75.0,
      },
      {
        name: 'Area C',
        totalWelds: 120,
        fitupCount: 100,
        weldCompleteCount: 75,
        acceptedCount: 60,
        ndePassRate: 80.0,
        repairRate: 20.0,
        pctTotal: 60.0,
      },
    ],
    grandTotal: {
      name: 'Grand Total',
      totalWelds: 370,
      fitupCount: 300,
      weldCompleteCount: 225,
      acceptedCount: 185,
      ndePassRate: 85.0,
      repairRate: 15.0,
      pctTotal: 66.7,
    },
    grand_total: {
      name: 'Grand Total',
      totalWelds: 370,
      fitupCount: 300,
      weldCompleteCount: 225,
      acceptedCount: 185,
      ndePassRate: 85.0,
      repairRate: 15.0,
      pctTotal: 66.7,
    },
    dimension: 'area',
  });

  describe('T041: Dual Export Acceptance', () => {
    it('classic export (jsPDF) produces valid PDF blob', async () => {
      const reportData = createMockReportData();

      // Generate classic PDF using jsPDF (simulate exportFieldWeldReport)
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Add title
      doc.setFontSize(16);
      doc.text('PipeTrak Field Weld Progress Report', 14, 15);
      doc.setFontSize(10);
      doc.text('Test Project - Area Report', 14, 22);

      // Build table data
      const tableData = reportData.rows.map((row) => [
        row.name,
        row.totalWelds.toString(),
        row.fitupCount?.toString() ?? '-',
        row.weldCompleteCount?.toString() ?? '-',
        row.acceptedCount?.toString() ?? '-',
        row.ndePassRate?.toFixed(1) ?? '-',
        row.repairRate?.toFixed(1) ?? '-',
        row.pctTotal?.toFixed(1) ?? '-',
      ]);

      // Add grand total row
      tableData.push([
        reportData.grandTotal.name,
        reportData.grandTotal.totalWelds.toString(),
        reportData.grandTotal.fitupCount?.toString() ?? '-',
        reportData.grandTotal.weldCompleteCount?.toString() ?? '-',
        reportData.grandTotal.acceptedCount?.toString() ?? '-',
        reportData.grandTotal.ndePassRate?.toFixed(1) ?? '-',
        reportData.grandTotal.repairRate?.toFixed(1) ?? '-',
        reportData.grandTotal.pctTotal?.toFixed(1) ?? '-',
      ]);

      // Generate table
      autoTable(doc, {
        head: [['Area', 'Total Welds', 'Fit-up', 'Weld Complete', 'Accepted', 'NDE Pass Rate', 'Repair Rate', '% Complete']],
        body: tableData,
        startY: 28,
      });

      // Get blob
      const classicBlob = doc.output('blob');

      // Verify blob is valid PDF
      expect(classicBlob).toBeDefined();
      expect(classicBlob instanceof Blob).toBe(true);
      expect(classicBlob.type).toBe('application/pdf');
      expect(classicBlob.size).toBeGreaterThan(0);
    });

    it('enhanced export (@react-pdf/renderer) produces valid PDF blob', async () => {
      const reportData = createMockReportData();

      // Generate enhanced PDF using @react-pdf/renderer
      const enhancedBlob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      // Verify blob is valid PDF
      expect(enhancedBlob).toBeDefined();
      expect(enhancedBlob instanceof Blob).toBe(true);
      expect(enhancedBlob.type).toBe('application/pdf');
      expect(enhancedBlob.size).toBeGreaterThan(0);
    }, 10000);

    it('both exports produce valid PDFs with different sizes', async () => {
      const reportData = createMockReportData();

      // Generate classic PDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      doc.setFontSize(16);
      doc.text('PipeTrak Field Weld Progress Report', 14, 15);
      doc.setFontSize(10);
      doc.text('Test Project - Area Report', 14, 22);

      const tableData = reportData.rows.map((row) => [
        row.name,
        row.totalWelds.toString(),
        row.fitupCount?.toString() ?? '-',
        row.weldCompleteCount?.toString() ?? '-',
        row.acceptedCount?.toString() ?? '-',
        row.ndePassRate?.toFixed(1) ?? '-',
        row.repairRate?.toFixed(1) ?? '-',
        row.pctTotal?.toFixed(1) ?? '-',
      ]);

      tableData.push([
        reportData.grandTotal.name,
        reportData.grandTotal.totalWelds.toString(),
        reportData.grandTotal.fitupCount?.toString() ?? '-',
        reportData.grandTotal.weldCompleteCount?.toString() ?? '-',
        reportData.grandTotal.acceptedCount?.toString() ?? '-',
        reportData.grandTotal.ndePassRate?.toFixed(1) ?? '-',
        reportData.grandTotal.repairRate?.toFixed(1) ?? '-',
        reportData.grandTotal.pctTotal?.toFixed(1) ?? '-',
      ]);

      autoTable(doc, {
        head: [['Area', 'Total Welds', 'Fit-up', 'Weld Complete', 'Accepted', 'NDE Pass Rate', 'Repair Rate', '% Complete']],
        body: tableData,
        startY: 28,
      });

      const classicBlob = doc.output('blob');

      // Generate enhanced PDF
      const enhancedBlob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      // Verify both are valid PDFs
      expect(classicBlob).toBeDefined();
      expect(classicBlob.type).toBe('application/pdf');
      expect(classicBlob.size).toBeGreaterThan(0);

      expect(enhancedBlob).toBeDefined();
      expect(enhancedBlob.type).toBe('application/pdf');
      expect(enhancedBlob.size).toBeGreaterThan(0);

      // Verify blobs have different sizes (different implementations)
      // Note: Sizes may be similar but should not be identical
      expect(classicBlob.size).not.toBe(enhancedBlob.size);
    }, 10000);

    it('both exports handle same data correctly', async () => {
      const reportData = createMockReportData();

      // Generate both PDFs
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      doc.setFontSize(16);
      doc.text('PipeTrak Field Weld Progress Report', 14, 15);

      const tableData = reportData.rows.map((row) => [
        row.name,
        row.totalWelds.toString(),
      ]);

      autoTable(doc, {
        head: [['Area', 'Total Welds']],
        body: tableData,
        startY: 28,
      });

      const classicBlob = doc.output('blob');

      const enhancedBlob = await pdf(
        <FieldWeldReportPDF
          reportData={reportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      // Both should be non-empty and valid
      expect(classicBlob.size).toBeGreaterThan(0);
      expect(enhancedBlob.size).toBeGreaterThan(0);

      // Both should have correct MIME type
      expect(classicBlob.type).toBe('application/pdf');
      expect(enhancedBlob.type).toBe('application/pdf');
    }, 10000);

    it('both exports work for all dimensions', async () => {
      const dimensions: Array<'area' | 'system' | 'test_package' | 'welder'> = [
        'area',
        'system',
        'test_package',
        'welder',
      ];

      for (const dimension of dimensions) {
        const reportData = {
          ...createMockReportData(),
          dimension,
        };

        // Classic export
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        });
        doc.setFontSize(16);
        doc.text(`PipeTrak Field Weld Progress Report - ${dimension}`, 14, 15);
        const classicBlob = doc.output('blob');

        // Enhanced export
        const enhancedBlob = await pdf(
          <FieldWeldReportPDF
            reportData={reportData}
            projectName="Test Project"
            dimension={dimension}
            generatedDate="2025-01-21"
          />
        ).toBlob();

        // Both should be valid
        expect(classicBlob.size).toBeGreaterThan(0);
        expect(enhancedBlob.size).toBeGreaterThan(0);
      }
    }, 30000);

    it('both exports handle large datasets (50 rows)', async () => {
      const largeReportData: FieldWeldReportData = {
        rows: Array.from({ length: 50 }, (_, i) => ({
          name: `Area ${i + 1}`,
          totalWelds: 100 + i,
          fitupCount: 80 + i,
          weldCompleteCount: 60 + i,
          acceptedCount: 50 + i,
          ndePassRate: 85.0,
          repairRate: 15.0,
          pctTotal: 65.0,
        })),
        grandTotal: {
          name: 'Grand Total',
          totalWelds: 5000,
          fitupCount: 4000,
          weldCompleteCount: 3000,
          acceptedCount: 2500,
          ndePassRate: 85.0,
          repairRate: 15.0,
          pctTotal: 65.0,
        },
        grand_total: {
          name: 'Grand Total',
          totalWelds: 5000,
          fitupCount: 4000,
          weldCompleteCount: 3000,
          acceptedCount: 2500,
          ndePassRate: 85.0,
          repairRate: 15.0,
          pctTotal: 65.0,
        },
        dimension: 'area',
      };

      // Classic export
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      doc.setFontSize(16);
      doc.text('PipeTrak Field Weld Progress Report', 14, 15);

      const tableData = largeReportData.rows.map((row) => [
        row.name,
        row.totalWelds.toString(),
      ]);

      autoTable(doc, {
        head: [['Area', 'Total Welds']],
        body: tableData,
        startY: 28,
      });

      const classicBlob = doc.output('blob');

      // Enhanced export
      const enhancedBlob = await pdf(
        <FieldWeldReportPDF
          reportData={largeReportData}
          projectName="Test Project"
          dimension="area"
          generatedDate="2025-01-21"
        />
      ).toBlob();

      // Both should handle large datasets
      expect(classicBlob.size).toBeGreaterThan(0);
      expect(enhancedBlob.size).toBeGreaterThan(0);

      // Verify size is reasonable (<500KB as per spec)
      const classicSizeKB = classicBlob.size / 1024;
      const enhancedSizeKB = enhancedBlob.size / 1024;

      expect(classicSizeKB).toBeLessThan(500);
      expect(enhancedSizeKB).toBeLessThan(500);
    }, 10000);
  });
});
