/**
 * Unit Tests: Table Component (Feature 029)
 *
 * Tests that Table correctly renders:
 * - Column definitions
 * - Data rows
 * - Grand total (optional)
 * - Grand total highlighting
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Table } from './Table';
import type { TableProps, TableColumnDefinition } from '@/types/pdf-components';

// Mock @react-pdf/renderer to avoid actual PDF generation
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="pdf-page">{children}</div>,
  View: ({ children }: any) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children }: any) => <span data-testid="pdf-text">{children}</span>,
  Image: ({ src }: any) => <img data-testid="pdf-image" src={src} alt="" />,
  StyleSheet: { create: (styles: any) => styles },
}));

// Mock table sub-components
vi.mock('./TableHeader', () => ({
  TableHeader: ({ columns }: any) => (
    <div data-testid="table-header">
      {columns.map((col: TableColumnDefinition) => (
        <span key={col.key} data-testid={`header-${col.key}`}>{col.label}</span>
      ))}
    </div>
  ),
}));

vi.mock('./TableRow', () => ({
  TableRow: ({ columns, data, highlighted }: any) => (
    <div data-testid="table-row" data-highlighted={highlighted}>
      {columns.map((col: TableColumnDefinition) => (
        <span key={col.key} data-testid={`cell-${col.key}`}>{data[col.key]}</span>
      ))}
    </div>
  ),
}));

describe('Table', () => {
  const columns: TableColumnDefinition[] = [
    { key: 'name', label: 'Name', width: '40%' },
    { key: 'installed', label: 'Installed', width: '10%', format: 'number' },
    { key: 'tested', label: 'Tested', width: '10%', format: 'number' },
    { key: 'completion', label: 'Completion', width: '10%', format: 'percentage' },
  ];

  const data = [
    { name: 'Area A', installed: 10, tested: 8, completion: 80 },
    { name: 'Area B', installed: 15, tested: 12, completion: 80 },
    { name: 'Area C', installed: 20, tested: 15, completion: 75 },
  ];

  it('renders table header with columns', () => {
    const props: TableProps = {
      columns,
      data,
    };
    const { container } = render(<Table {...props} />);
    const header = container.querySelector('[data-testid="table-header"]');
    expect(header).toBeTruthy();
    expect(container.querySelector('[data-testid="header-name"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="header-installed"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="header-tested"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="header-completion"]')).toBeTruthy();
  });

  it('renders all data rows', () => {
    const props: TableProps = {
      columns,
      data,
    };
    const { container } = render(<Table {...props} />);
    const rows = container.querySelectorAll('[data-testid="table-row"]');
    // 3 data rows (no grand total)
    expect(rows.length).toBe(3);
  });

  it('renders correct data in rows', () => {
    const props: TableProps = {
      columns,
      data,
    };
    const { container } = render(<Table {...props} />);
    expect(container.textContent).toContain('Area A');
    expect(container.textContent).toContain('Area B');
    expect(container.textContent).toContain('Area C');
  });

  it('renders grand total when provided', () => {
    const grandTotal = { name: 'Total', installed: 45, tested: 35, completion: 77.78 };
    const props: TableProps = {
      columns,
      data,
      grandTotal,
    };
    const { container } = render(<Table {...props} />);
    const rows = container.querySelectorAll('[data-testid="table-row"]');
    // 3 data rows + 1 grand total row
    expect(rows.length).toBe(4);
    expect(container.textContent).toContain('Total');
  });

  it('highlights grand total by default', () => {
    const grandTotal = { name: 'Total', installed: 45, tested: 35, completion: 77.78 };
    const props: TableProps = {
      columns,
      data,
      grandTotal,
    };
    const { container } = render(<Table {...props} />);
    const rows = container.querySelectorAll('[data-testid="table-row"]');
    const lastRow = rows[rows.length - 1];
    expect(lastRow?.getAttribute('data-highlighted')).toBe('true');
  });

  it('does not highlight grand total when highlightGrandTotal is false', () => {
    const grandTotal = { name: 'Total', installed: 45, tested: 35, completion: 77.78 };
    const props: TableProps = {
      columns,
      data,
      grandTotal,
      highlightGrandTotal: false,
    };
    const { container } = render(<Table {...props} />);
    const rows = container.querySelectorAll('[data-testid="table-row"]');
    const lastRow = rows[rows.length - 1];
    expect(lastRow?.getAttribute('data-highlighted')).toBe('false');
  });

  it('data rows are never highlighted', () => {
    const props: TableProps = {
      columns,
      data,
    };
    const { container } = render(<Table {...props} />);
    const rows = container.querySelectorAll('[data-testid="table-row"]');
    rows.forEach((row) => {
      expect(row.getAttribute('data-highlighted')).toBe('false');
    });
  });

  it('handles empty data array', () => {
    const props: TableProps = {
      columns,
      data: [],
    };
    const { container } = render(<Table {...props} />);
    const header = container.querySelector('[data-testid="table-header"]');
    expect(header).toBeTruthy(); // Header should still render
    const rows = container.querySelectorAll('[data-testid="table-row"]');
    expect(rows.length).toBe(0); // No data rows
  });

  it('handles single row', () => {
    const props: TableProps = {
      columns,
      data: [data[0]!],
    };
    const { container } = render(<Table {...props} />);
    const rows = container.querySelectorAll('[data-testid="table-row"]');
    expect(rows.length).toBe(1);
  });

  it('handles null values in data', () => {
    const dataWithNulls = [
      { name: 'Area A', installed: 10, tested: null, completion: null },
    ];
    const props: TableProps = {
      columns,
      data: dataWithNulls,
    };
    const { container } = render(<Table {...props} />);
    const rows = container.querySelectorAll('[data-testid="table-row"]');
    expect(rows.length).toBe(1);
  });

  it('passes columns to TableHeader', () => {
    const props: TableProps = {
      columns,
      data,
    };
    const { container } = render(<Table {...props} />);
    const header = container.querySelector('[data-testid="table-header"]');
    expect(header?.querySelector('[data-testid="header-name"]')?.textContent).toBe('Name');
    expect(header?.querySelector('[data-testid="header-installed"]')?.textContent).toBe('Installed');
  });

  it('passes columns to TableRow', () => {
    const props: TableProps = {
      columns,
      data: [data[0]!],
    };
    const { container } = render(<Table {...props} />);
    const row = container.querySelector('[data-testid="table-row"]');
    expect(row?.querySelector('[data-testid="cell-name"]')).toBeTruthy();
    expect(row?.querySelector('[data-testid="cell-installed"]')).toBeTruthy();
  });

  it('handles different column widths', () => {
    const columnsWithDifferentWidths: TableColumnDefinition[] = [
      { key: 'a', label: 'A', width: '50%' },
      { key: 'b', label: 'B', width: '25%' },
      { key: 'c', label: 'C', width: '25%' },
    ];
    const props: TableProps = {
      columns: columnsWithDifferentWidths,
      data: [{ a: '1', b: '2', c: '3' }],
    };
    const { container } = render(<Table {...props} />);
    const header = container.querySelector('[data-testid="table-header"]');
    expect(header).toBeTruthy();
  });

  it('handles large number of rows', () => {
    const largeData = Array.from({ length: 100 }, (_, i) => ({
      name: `Area ${i}`,
      installed: i * 10,
      tested: i * 8,
      completion: 80,
    }));
    const props: TableProps = {
      columns,
      data: largeData,
    };
    const { container } = render(<Table {...props} />);
    const rows = container.querySelectorAll('[data-testid="table-row"]');
    expect(rows.length).toBe(100);
  });
});
