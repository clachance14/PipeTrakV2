/**
 * ManhourBudgetReportPDF Component Tests
 * Tests for PDF document generation of manhour budget report
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManhourBudgetReportPDF } from './ManhourBudgetReportPDF';
import type { ManhourReportData } from '@/types/reports';

// Mock @react-pdf/renderer
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-page">{children}</div>,
  View: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span data-testid="pdf-text">{children}</span>,
  StyleSheet: { create: (styles: Record<string, unknown>) => styles },
}));

// Mock PDF components
vi.mock('../layout/BrandedHeader', () => ({
  BrandedHeader: ({ title }: { title: string }) => <div data-testid="branded-header">{title}</div>,
}));

vi.mock('../layout/ReportFooter', () => ({
  ReportFooter: () => <div data-testid="report-footer">Footer</div>,
}));

vi.mock('../tables/Table', () => ({
  Table: ({ data, grandTotal }: { data: unknown[]; grandTotal: unknown }) => (
    <div data-testid="pdf-table">
      <span>Rows: {data.length}</span>
      <span>Grand Total: {grandTotal ? 'Yes' : 'No'}</span>
    </div>
  ),
}));

describe('ManhourBudgetReportPDF', () => {
  const mockData: ManhourReportData = {
    dimension: 'area',
    projectId: 'test-project',
    generatedAt: new Date('2026-02-17'),
    rows: [
      {
        id: '1',
        name: 'Area A',
        projectId: 'test-project',
        mhBudget: 1000,
        receiveMhBudget: 100,
        receiveMhEarned: 50,
        installMhBudget: 400,
        installMhEarned: 200,
        punchMhBudget: 200,
        punchMhEarned: 100,
        testMhBudget: 200,
        testMhEarned: 100,
        restoreMhBudget: 100,
        restoreMhEarned: 50,
        totalMhEarned: 500,
        mhPctComplete: 50,
      },
    ],
    grandTotal: {
      name: 'Grand Total',
      mhBudget: 1000,
      receiveMhBudget: 100,
      receiveMhEarned: 50,
      installMhBudget: 400,
      installMhEarned: 200,
      punchMhBudget: 200,
      punchMhEarned: 100,
      testMhBudget: 200,
      testMhEarned: 100,
      restoreMhBudget: 100,
      restoreMhEarned: 50,
      totalMhEarned: 500,
      mhPctComplete: 50,
    },
  };

  it('renders PDF document structure', () => {
    render(
      <ManhourBudgetReportPDF
        reportData={mockData}
        projectName="Test Project"
        dimension="area"
        generatedDate="2026-02-17"
      />
    );

    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-page')).toBeInTheDocument();
    expect(screen.getByTestId('branded-header')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-table')).toBeInTheDocument();
    expect(screen.getByTestId('report-footer')).toBeInTheDocument();
  });

  it('displays correct report title', () => {
    render(
      <ManhourBudgetReportPDF
        reportData={mockData}
        projectName="Test Project"
        dimension="area"
        generatedDate="2026-02-17"
      />
    );

    expect(screen.getByText('PipeTrak Manhour Budget Report')).toBeInTheDocument();
  });

  it('renders table with data rows', () => {
    render(
      <ManhourBudgetReportPDF
        reportData={mockData}
        projectName="Test Project"
        dimension="area"
        generatedDate="2026-02-17"
      />
    );

    expect(screen.getByText('Rows: 1')).toBeInTheDocument();
    expect(screen.getByText('Grand Total: Yes')).toBeInTheDocument();
  });

  it('handles empty data with appropriate message', () => {
    const emptyData: ManhourReportData = {
      ...mockData,
      rows: [],
    };

    render(
      <ManhourBudgetReportPDF
        reportData={emptyData}
        projectName="Test Project"
        dimension="area"
        generatedDate="2026-02-17"
      />
    );

    expect(screen.getByText('No data available for this report.')).toBeInTheDocument();
  });
});
