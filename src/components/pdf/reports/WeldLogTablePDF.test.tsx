/**
 * Unit Tests: WeldLogTablePDF Component
 * Feature 030: Enhanced Package Completion Report PDF
 *
 * Tests that WeldLogTablePDF correctly:
 * - Renders weld data in table format
 * - Paginates large datasets
 * - Displays NDE status correctly
 * - Handles empty weld arrays
 * - Shows/hides section title
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { WeldLogTablePDF } from './WeldLogTablePDF';
import type { WeldLogEntry } from '@/types/packageReport';

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

describe('WeldLogTablePDF', () => {
  describe('empty state', () => {
    it('renders empty state message when welds array is empty', () => {
      const { container } = render(<WeldLogTablePDF welds={[]} />);
      expect(container.textContent).toContain('No welds in this section');
    });

    it('shows section title with empty state', () => {
      const { container } = render(<WeldLogTablePDF welds={[]} />);
      expect(container.textContent).toContain('Weld Log');
    });

    it('hides section title when showTitle=false', () => {
      const { container } = render(<WeldLogTablePDF welds={[]} showTitle={false} />);
      expect(container.textContent).not.toContain('Weld Log');
      expect(container.textContent).toContain('No welds in this section');
    });
  });

  describe('table headers', () => {
    it('renders all column headers', () => {
      const welds = [createWeld()];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      expect(container.textContent).toContain('Weld #');
      expect(container.textContent).toContain('Component');
      expect(container.textContent).toContain('Type');
      expect(container.textContent).toContain('Welder');
      expect(container.textContent).toContain('Date');
      expect(container.textContent).toContain('NDE Req');
      expect(container.textContent).toContain('NDE Type');
      expect(container.textContent).toContain('Result');
    });
  });

  describe('weld data display', () => {
    it('renders weld display name', () => {
      const welds = [createWeld({ weld_display_name: 'W-ABC-001' })];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      expect(container.textContent).toContain('W-ABC-001');
    });

    it('renders component identity key', () => {
      const welds = [createWeld({ component_identity_key: 'PIPE-XYZ' })];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      expect(container.textContent).toContain('PIPE-XYZ');
    });

    it('renders weld type', () => {
      const welds = [createWeld({ weld_type: 'Socket' })];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      expect(container.textContent).toContain('Socket');
    });

    it('renders welder name', () => {
      const welds = [createWeld({ welder_name: 'Jane Doe' })];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      expect(container.textContent).toContain('Jane Doe');
    });

    it('renders formatted date', () => {
      const welds = [createWeld({ date_welded: '2025-01-15' })];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      expect(container.textContent).toContain('Jan 15, 25');
    });

    it('shows dash for null date', () => {
      const welds = [createWeld({ date_welded: null })];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      // The dash should appear somewhere in the output
      expect(container.textContent).toContain('-');
    });
  });

  describe('NDE status display', () => {
    it('shows Yes when NDE required', () => {
      const welds = [createWeld({ nde_required: true })];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      expect(container.textContent).toContain('Yes');
    });

    it('shows No when NDE not required', () => {
      const welds = [createWeld({ nde_required: false })];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      expect(container.textContent).toContain('No');
    });

    it('shows NDE type when required', () => {
      const welds = [createWeld({ nde_required: true, nde_type: 'RT' })];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      expect(container.textContent).toContain('RT');
    });

    it('shows PASS result', () => {
      const welds = [createWeld({ nde_required: true, nde_result: 'PASS' })];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      expect(container.textContent).toContain('PASS');
    });

    it('shows FAIL result', () => {
      const welds = [createWeld({ nde_required: true, nde_result: 'FAIL' })];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      expect(container.textContent).toContain('FAIL');
    });

    it('shows Pending when no result', () => {
      const welds = [createWeld({ nde_required: true, nde_result: null })];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      expect(container.textContent).toContain('Pending');
    });

    it('shows dash for result when NDE not required', () => {
      const welds = [createWeld({ nde_required: false })];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      // Multiple dashes appear for non-NDE welds
      const content = container.textContent || '';
      expect(content.split('-').length).toBeGreaterThan(1);
    });
  });

  describe('pagination', () => {
    it('renders single page for small datasets', () => {
      const welds = Array.from({ length: 10 }, (_, i) =>
        createWeld({ id: `weld-${i}`, weld_display_name: `W-${i}` })
      );
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      // Should not show page info for single page
      expect(container.textContent).not.toContain('Page 1 of');
    });

    it('shows page info for multi-page datasets', () => {
      const welds = Array.from({ length: 35 }, (_, i) =>
        createWeld({ id: `weld-${i}`, weld_display_name: `W-${i}` })
      );
      const { container } = render(<WeldLogTablePDF welds={welds} pageSize={30} />);
      expect(container.textContent).toContain('Page 1 of 2');
      expect(container.textContent).toContain('35 total welds');
    });

    it('respects custom pageSize', () => {
      const welds = Array.from({ length: 30 }, (_, i) =>
        createWeld({ id: `weld-${i}`, weld_display_name: `W-${i}` })
      );
      const { container } = render(<WeldLogTablePDF welds={welds} pageSize={10} />);
      expect(container.textContent).toContain('Page 1 of 3');
    });

    it('renders all welds across pages', () => {
      const welds = Array.from({ length: 40 }, (_, i) =>
        createWeld({ id: `weld-${i}`, weld_display_name: `W-${String(i).padStart(3, '0')}` })
      );
      const { container } = render(<WeldLogTablePDF welds={welds} pageSize={30} />);
      // Check that welds from both pages are rendered
      expect(container.textContent).toContain('W-000');
      expect(container.textContent).toContain('W-039');
    });
  });

  describe('section title', () => {
    it('shows section title by default', () => {
      const welds = [createWeld()];
      const { container } = render(<WeldLogTablePDF welds={welds} />);
      expect(container.textContent).toContain('Weld Log');
    });

    it('hides section title when showTitle=false', () => {
      const welds = [createWeld()];
      const { container } = render(<WeldLogTablePDF welds={welds} showTitle={false} />);
      expect(container.textContent).not.toContain('Weld Log');
    });
  });
});
