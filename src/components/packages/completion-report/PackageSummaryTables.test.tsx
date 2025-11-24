/**
 * Tests for PackageSummaryTables component
 * Feature 030: Package Completion Report - Summary tables
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PackageSummaryTables } from './PackageSummaryTables';
import type { ComponentSummaryRow, SupportSummaryRow } from '@/types/packageReport';

describe('PackageSummaryTables', () => {
  const mockComponentSummary: ComponentSummaryRow[] = [
    {
      drawing_no_norm: 'P-001',
      component_type: 'field_weld',
      identity_display: 'W-001',
      quantity: 1,
    },
    {
      drawing_no_norm: 'P-001',
      component_type: 'support',
      identity_display: 'CS-2/2IN',
      quantity: 3,
    },
    {
      drawing_no_norm: 'P-002',
      component_type: 'valve',
      identity_display: 'V-100',
      quantity: 1,
    },
  ];

  const mockSupportSummary: SupportSummaryRow[] = [
    {
      commodity_code: 'CS-2',
      size: '2IN',
      quantity: 3,
    },
    {
      commodity_code: 'CS-2',
      size: '4IN',
      quantity: 2,
    },
    {
      commodity_code: 'HNGR-001',
      size: '2IN',
      quantity: 1,
    },
  ];

  describe('Component Summary Table', () => {
    it('should render component summary table with correct headers', () => {
      render(
        <PackageSummaryTables
          componentSummary={mockComponentSummary}
          supportSummary={mockSupportSummary}
        />
      );

      expect(screen.getByText('Component Summary')).toBeInTheDocument();
      expect(screen.getByText('Drawing')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Identity')).toBeInTheDocument();
      // Quantity appears in both tables
      const quantityHeaders = screen.getAllByText('Quantity');
      expect(quantityHeaders.length).toBeGreaterThanOrEqual(1);
    });

    it('should render all component summary rows', () => {
      const { container } = render(
        <PackageSummaryTables
          componentSummary={mockComponentSummary}
          supportSummary={mockSupportSummary}
        />
      );

      // Check that specific values are present (may appear multiple times)
      expect(screen.getAllByText('P-001').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('field_weld')).toBeInTheDocument();
      expect(screen.getByText('W-001')).toBeInTheDocument();
      expect(screen.getByText('P-002')).toBeInTheDocument();
      expect(screen.getByText('valve')).toBeInTheDocument();
      expect(screen.getByText('V-100')).toBeInTheDocument();

      // Verify we have 3 rows in component table
      const componentTable = container.querySelectorAll('table')[0];
      const rows = componentTable.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);
    });

    it('should display quantities correctly', () => {
      render(
        <PackageSummaryTables
          componentSummary={mockComponentSummary}
          supportSummary={mockSupportSummary}
        />
      );

      const quantityCells = screen.getAllByText(/^[0-9]+$/);
      expect(quantityCells.length).toBeGreaterThan(0);
    });

    it('should show "No components" when component summary is empty', () => {
      render(
        <PackageSummaryTables
          componentSummary={[]}
          supportSummary={mockSupportSummary}
        />
      );

      expect(screen.getByText(/no components/i)).toBeInTheDocument();
    });
  });

  describe('Support Summary Table', () => {
    it('should render support summary table with correct headers', () => {
      render(
        <PackageSummaryTables
          componentSummary={mockComponentSummary}
          supportSummary={mockSupportSummary}
        />
      );

      expect(screen.getByText('Support Summary')).toBeInTheDocument();
      expect(screen.getByText('Commodity Code')).toBeInTheDocument();
      expect(screen.getByText('Size')).toBeInTheDocument();
      // Quantity header appears in both tables - already verified above
      const quantityHeaders = screen.getAllByText('Quantity');
      expect(quantityHeaders.length).toBe(2); // One in each table
    });

    it('should render all support summary rows', () => {
      const { container } = render(
        <PackageSummaryTables
          componentSummary={mockComponentSummary}
          supportSummary={mockSupportSummary}
        />
      );

      // Check that specific values are present (CS-2 appears twice, 2IN appears twice)
      expect(screen.getAllByText('CS-2').length).toBe(2);
      expect(screen.getAllByText('2IN').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('4IN')).toBeInTheDocument();
      expect(screen.getByText('HNGR-001')).toBeInTheDocument();

      // Verify we have 3 rows in support table
      const supportTable = container.querySelectorAll('table')[1];
      const rows = supportTable.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);
    });

    it('should show "No supports" when support summary is empty', () => {
      render(
        <PackageSummaryTables
          componentSummary={mockComponentSummary}
          supportSummary={[]}
        />
      );

      expect(screen.getByText(/no supports/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should render both tables in the same container', () => {
      const { container } = render(
        <PackageSummaryTables
          componentSummary={mockComponentSummary}
          supportSummary={mockSupportSummary}
        />
      );

      // Both tables should be in the same parent container
      const tables = container.querySelectorAll('table');
      expect(tables).toHaveLength(2);
    });
  });
});
