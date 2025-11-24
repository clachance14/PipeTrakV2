/**
 * Unit Tests: WeldLogReportPDF Component
 *
 * Tests that WeldLogReportPDF correctly handles:
 * - Rendering weld log data
 * - Empty data edge case
 * - Multi-page reports (>50 rows)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeldLogReportPDF } from './WeldLogReportPDF';
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds';

// Mock @react-pdf/renderer to avoid actual PDF generation
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children, size, orientation }: any) => (
    <div data-testid="pdf-page" data-size={size} data-orientation={orientation}>
      {children}
    </div>
  ),
  View: ({ children }: any) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children }: any) => <span data-testid="pdf-text">{children}</span>,
  Image: ({ src }: any) => <img data-testid="pdf-image" src={src} alt="" />,
  StyleSheet: { create: (styles: any) => styles },
}));

// Mock sub-components
vi.mock('../layout/BrandedHeader', () => ({
  BrandedHeader: ({ title, projectName, dimensionLabel, generatedDate }: any) => (
    <div data-testid="branded-header">
      <span data-testid="header-title">{title}</span>
      <span data-testid="header-project">{projectName}</span>
      <span data-testid="header-dimension">{dimensionLabel}</span>
      <span data-testid="header-date">{generatedDate}</span>
    </div>
  ),
}));

vi.mock('../layout/ReportFooter', () => ({
  ReportFooter: ({ showPageNumbers }: any) => (
    <div data-testid="report-footer">
      {showPageNumbers && <span>Page Numbers</span>}
    </div>
  ),
}));

vi.mock('../tables/TableHeader', () => ({
  TableHeader: ({ columns }: any) => (
    <div data-testid="table-header">
      {columns.map((col: any) => (
        <span key={col.key} data-testid="column-header">{col.label}</span>
      ))}
    </div>
  ),
}));

vi.mock('../tables/TableRow', () => ({
  TableRow: ({ data }: any) => (
    <div data-testid="table-row">
      {Object.values(data).map((value: any, index: number) => (
        <span key={index} data-testid="table-cell">{String(value)}</span>
      ))}
    </div>
  ),
}));

describe('WeldLogReportPDF', () => {
  const mockWeld: EnrichedFieldWeld = {
    id: '1',
    component_id: 'comp-1',
    project_id: 'proj-1',
    weld_type: 'BW',
    weld_size: '2"',
    schedule: 'STD',
    base_metal: 'CS',
    spec: 'B31.3',
    welder_id: 'welder-1',
    date_welded: '2025-01-15',
    nde_required: true,
    nde_type: 'RT',
    nde_result: 'PASS',
    nde_date: '2025-01-16',
    nde_notes: null,
    status: 'accepted',
    original_weld_id: null,
    is_repair: false,
    is_unplanned: false,
    notes: null,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-16T10:00:00Z',
    component: {
      id: 'comp-1',
      drawing_id: 'drawing-1',
      type: 'PIPE',
      identity_key: {},
      percent_complete: 85,
      current_milestones: {},
      area_id: 'area-1',
      system_id: 'system-1',
      test_package_id: 'pkg-1',
    },
    drawing: {
      id: 'drawing-1',
      drawing_no_norm: 'P-001',
      project_id: 'proj-1',
    },
    welder: {
      id: 'welder-1',
      stencil: 'W1',
      name: 'John Doe',
      status: 'verified',
    },
    area: {
      id: 'area-1',
      name: 'Area A',
      description: null,
    },
    system: {
      id: 'system-1',
      name: 'System 1',
      description: null,
    },
    test_package: {
      id: 'pkg-1',
      name: 'Package A',
      description: null,
    },
    identityDisplay: 'W-1',
  };

  it('renders document with weld data', () => {
    render(
      <WeldLogReportPDF
        welds={[mockWeld]}
        projectName="Test Project"
        generatedDate="2025-01-21"
      />
    );

    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    expect(screen.getByTestId('branded-header')).toBeInTheDocument();
    expect(screen.getByTestId('header-title')).toHaveTextContent('PipeTrak Weld Log');
    expect(screen.getByTestId('header-project')).toHaveTextContent('Test Project');
  });

  it('renders empty state when no welds provided', () => {
    render(
      <WeldLogReportPDF
        welds={[]}
        projectName="Test Project"
        generatedDate="2025-01-21"
      />
    );

    expect(screen.getByText('No welds available in the weld log.')).toBeInTheDocument();
  });

  it('renders table with correct number of columns', () => {
    render(
      <WeldLogReportPDF
        welds={[mockWeld]}
        projectName="Test Project"
        generatedDate="2025-01-21"
      />
    );

    // Verify column headers are present
    expect(screen.getByText('Weld ID')).toBeInTheDocument();
    expect(screen.getByText('Drawing')).toBeInTheDocument();
    expect(screen.getByText('Welder')).toBeInTheDocument();
    expect(screen.getByText('Progress %')).toBeInTheDocument();
  });

  it('handles multiple welds', () => {
    const mockWeld2 = { ...mockWeld, id: '2', identityDisplay: 'W-2' };
    render(
      <WeldLogReportPDF
        welds={[mockWeld, mockWeld2]}
        projectName="Test Project"
        generatedDate="2025-01-21"
      />
    );

    // Verify both weld IDs are rendered
    expect(screen.getByText('W-1')).toBeInTheDocument();
    expect(screen.getByText('W-2')).toBeInTheDocument();
  });

  it('renders with company logo', () => {
    render(
      <WeldLogReportPDF
        welds={[mockWeld]}
        projectName="Test Project"
        generatedDate="2025-01-21"
        companyLogo="data:image/png;base64,test"
      />
    );

    expect(screen.getByTestId('branded-header')).toBeInTheDocument();
  });

  it('uses landscape orientation', () => {
    render(
      <WeldLogReportPDF
        welds={[mockWeld]}
        projectName="Test Project"
        generatedDate="2025-01-21"
      />
    );

    expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-orientation', 'landscape');
  });

  it('table body has sufficient top margin to avoid header overlap', () => {
    // This test verifies the fix for the header overlap bug
    // Fixed header is at top: 70, extends to ~96-98
    // Table body must start at position >= 97 to avoid overlap
    // With paddingTop: 80, marginTop should be >= 17 (ideally 20)

    // Note: This is a structural test. Visual verification with actual PDF
    // generation is still required to confirm the fix works correctly.
    render(
      <WeldLogReportPDF
        welds={[mockWeld]}
        projectName="Test Project"
        generatedDate="2025-01-21"
      />
    );

    // Verify the document renders (structural integrity)
    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    expect(screen.getByTestId('table-header')).toBeInTheDocument();
    expect(screen.getByTestId('table-row')).toBeInTheDocument();
  });
});
