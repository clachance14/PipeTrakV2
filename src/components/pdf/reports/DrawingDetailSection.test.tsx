/**
 * Unit Tests: DrawingDetailSection Component
 * Feature 030: Enhanced Package Completion Report PDF
 *
 * Tests that DrawingDetailSection correctly:
 * - Renders drawing header with counts
 * - Displays component table
 * - Shows NDE summary metrics
 * - Conditionally includes weld details
 * - Handles empty component lists
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DrawingDetailSection } from './DrawingDetailSection';
import type { DrawingGroup, WeldLogEntry } from '@/types/packageReport';

// Mock @react-pdf/renderer
vi.mock('@react-pdf/renderer', () => ({
  View: ({ children, wrap }: any) => (
    <div data-testid="pdf-view" data-wrap={wrap}>
      {children}
    </div>
  ),
  Text: ({ children }: any) => <span data-testid="pdf-text">{children}</span>,
  StyleSheet: { create: (styles: any) => styles },
}));

// Mock WeldLogTablePDF
vi.mock('./WeldLogTablePDF', () => ({
  WeldLogTablePDF: ({ welds }: any) => (
    <div data-testid="weld-log-table">Weld Log Table ({welds.length} welds)</div>
  ),
}));

// Factory for creating test weld entries
function createWeld(overrides: Partial<WeldLogEntry> = {}): WeldLogEntry {
  return {
    id: `weld-${Math.random().toString(36).slice(2)}`,
    weld_display_name: 'W-001',
    component_id: 'comp-123',
    component_identity_key: 'PIPE-001',
    weld_type: 'Butt',
    welder_id: 'welder-1',
    welder_name: 'John Smith',
    date_welded: '2025-01-15',
    nde_required: true,
    nde_type: 'RT',
    nde_result: null,
    nde_date: null,
    ...overrides,
  };
}

// Factory for creating test drawing group
function createDrawing(overrides: Partial<DrawingGroup> = {}): DrawingGroup {
  return {
    drawing_id: 'draw-123',
    drawing_no_norm: 'DWG-001',
    component_count: 2,
    unique_supports_count: 1,
    components: [
      {
        id: 'comp-1',
        component_type: 'pipe',
        identity_key: 'PIPE-001',
      },
      {
        id: 'comp-2',
        component_type: 'valve',
        identity_key: 'VALVE-001',
      },
      {
        id: 'comp-3',
        component_type: 'support',
        identity_key: 'SUPP-001',
      },
    ],
    nde_summary: {
      total_welds: 5,
      nde_required_count: 3,
      nde_pass_count: 2,
      nde_fail_count: 0,
      nde_pending_count: 1,
    },
    weld_log: [createWeld(), createWeld(), createWeld()],
    ...overrides,
  };
}

describe('DrawingDetailSection', () => {
  describe('drawing header', () => {
    it('renders drawing number', () => {
      const drawing = createDrawing({ drawing_no_norm: 'DWG-ABC-123' });
      const { container } = render(<DrawingDetailSection drawing={drawing} />);
      expect(container.textContent).toContain('Drawing: DWG-ABC-123');
    });

    it('renders component count with correct plurality', () => {
      const singleComponent = createDrawing({ component_count: 1 });
      const { container: single } = render(<DrawingDetailSection drawing={singleComponent} />);
      expect(single.textContent).toContain('1 Component');
      expect(single.textContent).not.toContain('1 Components');

      const multipleComponents = createDrawing({ component_count: 5 });
      const { container: multiple } = render(<DrawingDetailSection drawing={multipleComponents} />);
      expect(multiple.textContent).toContain('5 Components');
    });

    it('renders support count with correct plurality', () => {
      const singleSupport = createDrawing({ unique_supports_count: 1 });
      const { container: single } = render(<DrawingDetailSection drawing={singleSupport} />);
      expect(single.textContent).toContain('1 Support');
      expect(single.textContent).not.toContain('1 Supports');

      const multipleSupports = createDrawing({ unique_supports_count: 3 });
      const { container: multiple } = render(<DrawingDetailSection drawing={multipleSupports} />);
      expect(multiple.textContent).toContain('3 Supports');
    });

    it('renders weld count with correct plurality', () => {
      const singleWeld = createDrawing({
        nde_summary: { ...createDrawing().nde_summary, total_welds: 1 },
      });
      const { container: single } = render(<DrawingDetailSection drawing={singleWeld} />);
      expect(single.textContent).toContain('1 Weld');
      expect(single.textContent).not.toContain('1 Welds');

      const multipleWelds = createDrawing({
        nde_summary: { ...createDrawing().nde_summary, total_welds: 10 },
      });
      const { container: multiple } = render(<DrawingDetailSection drawing={multipleWelds} />);
      expect(multiple.textContent).toContain('10 Welds');
    });
  });

  describe('component table', () => {
    it('renders Components section label', () => {
      const drawing = createDrawing();
      const { container } = render(<DrawingDetailSection drawing={drawing} />);
      expect(container.textContent).toContain('Components');
    });

    it('renders table headers', () => {
      const drawing = createDrawing();
      const { container } = render(<DrawingDetailSection drawing={drawing} />);
      expect(container.textContent).toContain('Type');
      expect(container.textContent).toContain('Identity Key');
    });

    it('renders component type and identity key', () => {
      const drawing = createDrawing({
        components: [
          { id: '1', component_type: 'pipe', identity_key: 'PIPE-XYZ' },
          { id: '2', component_type: 'elbow', identity_key: 'ELBOW-123' },
        ],
      });
      const { container } = render(<DrawingDetailSection drawing={drawing} />);
      expect(container.textContent).toContain('pipe');
      expect(container.textContent).toContain('PIPE-XYZ');
      expect(container.textContent).toContain('elbow');
      expect(container.textContent).toContain('ELBOW-123');
    });

    it('excludes support components from table', () => {
      const drawing = createDrawing({
        components: [
          { id: '1', component_type: 'pipe', identity_key: 'PIPE-001' },
          { id: '2', component_type: 'support', identity_key: 'SUPP-001' },
        ],
      });
      const { container } = render(<DrawingDetailSection drawing={drawing} />);
      expect(container.textContent).toContain('pipe');
      expect(container.textContent).toContain('PIPE-001');
      expect(container.textContent).not.toContain('SUPP-001');
    });

    it('shows empty state when only supports exist', () => {
      const drawing = createDrawing({
        components: [{ id: '1', component_type: 'support', identity_key: 'SUPP-001' }],
      });
      const { container } = render(<DrawingDetailSection drawing={drawing} />);
      expect(container.textContent).toContain('No piping components in this drawing');
      expect(container.textContent).toContain('supports only');
    });
  });

  describe('NDE summary', () => {
    it('renders NDE Summary section label', () => {
      const drawing = createDrawing();
      const { container } = render(<DrawingDetailSection drawing={drawing} />);
      expect(container.textContent).toContain('NDE Summary');
    });

    it('renders total welds', () => {
      const drawing = createDrawing({
        nde_summary: { ...createDrawing().nde_summary, total_welds: 15 },
      });
      const { container } = render(<DrawingDetailSection drawing={drawing} />);
      expect(container.textContent).toContain('15');
      expect(container.textContent).toContain('Total Welds');
    });

    it('renders NDE required count', () => {
      const drawing = createDrawing({
        nde_summary: { ...createDrawing().nde_summary, nde_required_count: 8 },
      });
      const { container } = render(<DrawingDetailSection drawing={drawing} />);
      expect(container.textContent).toContain('8');
      expect(container.textContent).toContain('NDE Required');
    });

    it('renders pass/fail/pending counts', () => {
      const drawing = createDrawing({
        nde_summary: {
          total_welds: 10,
          nde_required_count: 6,
          nde_pass_count: 4,
          nde_fail_count: 1,
          nde_pending_count: 1,
        },
      });
      const { container } = render(<DrawingDetailSection drawing={drawing} />);
      expect(container.textContent).toContain('Pass');
      expect(container.textContent).toContain('Fail');
      expect(container.textContent).toContain('Pending');
    });

    it('does not render NDE summary when no welds', () => {
      const drawing = createDrawing({
        nde_summary: {
          total_welds: 0,
          nde_required_count: 0,
          nde_pass_count: 0,
          nde_fail_count: 0,
          nde_pending_count: 0,
        },
      });
      const { container } = render(<DrawingDetailSection drawing={drawing} />);
      expect(container.textContent).not.toContain('NDE Summary');
    });
  });

  describe('weld details', () => {
    it('does not show weld log by default', () => {
      const drawing = createDrawing({
        weld_log: [createWeld(), createWeld()],
      });
      const { container } = render(<DrawingDetailSection drawing={drawing} />);
      expect(container.textContent).not.toContain('Weld Log Table');
    });

    it('shows weld log when includeWeldDetails=true', () => {
      const drawing = createDrawing({
        weld_log: [createWeld(), createWeld()],
      });
      const { container } = render(
        <DrawingDetailSection drawing={drawing} includeWeldDetails={true} />
      );
      expect(container.textContent).toContain('Weld Log Table');
      expect(container.textContent).toContain('2 welds');
    });

    it('shows no welds message when includeWeldDetails=true but no welds', () => {
      const drawing = createDrawing({
        weld_log: [],
        nde_summary: { ...createDrawing().nde_summary, total_welds: 0 },
      });
      const { container } = render(
        <DrawingDetailSection drawing={drawing} includeWeldDetails={true} />
      );
      expect(container.textContent).toContain('No welds in this drawing');
    });
  });
});
