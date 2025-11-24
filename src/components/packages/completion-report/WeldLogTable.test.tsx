/**
 * Tests for WeldLogTable component (Package Completion Report)
 * Feature 030: Test Package Workflow - Weld log display
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeldLogTable } from './WeldLogTable';
import type { WeldLogEntry } from '@/types/packageReport';

describe('WeldLogTable', () => {
  const mockWeldLogEntries: WeldLogEntry[] = [
    {
      id: 'weld-1',
      component_id: 'comp-1',
      project_id: 'proj-1',
      weld_type: 'BW',
      weld_size: '4"',
      nde_required: true,
      nde_type: 'RT',
      nde_result: 'PASS',
      nde_date: '2025-11-20',
      nde_notes: null,
      status: 'complete',
      welder_id: 'welder-1',
      date_welded: '2025-11-15',
      created_by: 'user-1',
      created_at: '2025-11-10T00:00:00Z',
      updated_at: '2025-11-20T00:00:00Z',
      base_metal: null,
      schedule: null,
      spec: null,
      notes: null,
      is_repair: false,
      is_unplanned: false,
      original_weld_id: null,
      xray_percentage: null,
      component_identity_key: { weld_number: 'W-001' },
      component_type: 'field_weld',
      weld_display_name: 'W-001',
      welder_name: 'John Doe',
    },
    {
      id: 'weld-2',
      component_id: 'comp-2',
      project_id: 'proj-1',
      weld_type: 'SW',
      weld_size: '2"',
      nde_required: true,
      nde_type: 'UT',
      nde_result: 'PENDING',
      nde_date: null,
      nde_notes: null,
      status: 'in_progress',
      welder_id: 'welder-2',
      date_welded: '2025-11-18',
      created_by: 'user-1',
      created_at: '2025-11-10T00:00:00Z',
      updated_at: '2025-11-18T00:00:00Z',
      base_metal: null,
      schedule: null,
      spec: null,
      notes: null,
      is_repair: false,
      is_unplanned: false,
      original_weld_id: null,
      xray_percentage: null,
      component_identity_key: { weld_number: 'W-002' },
      component_type: 'field_weld',
      weld_display_name: 'W-002',
      welder_name: null,
    },
    {
      id: 'weld-3',
      component_id: 'comp-3',
      project_id: 'proj-1',
      weld_type: 'FW',
      weld_size: '1"',
      nde_required: true,
      nde_type: 'PT',
      nde_result: 'FAIL',
      nde_date: '2025-11-19',
      nde_notes: 'Crack detected',
      status: 'rejected',
      welder_id: 'welder-1',
      date_welded: '2025-11-16',
      created_by: 'user-1',
      created_at: '2025-11-10T00:00:00Z',
      updated_at: '2025-11-19T00:00:00Z',
      base_metal: null,
      schedule: null,
      spec: null,
      notes: null,
      is_repair: false,
      is_unplanned: false,
      original_weld_id: null,
      xray_percentage: null,
      component_identity_key: { weld_number: 'W-003' },
      component_type: 'field_weld',
      weld_display_name: 'W-003',
      welder_name: 'John Doe',
    },
  ];

  it('should render table with all columns', () => {
    render(<WeldLogTable welds={mockWeldLogEntries} />);

    // Check column headers
    expect(screen.getByText('Weld Number')).toBeInTheDocument();
    expect(screen.getByText('Welder')).toBeInTheDocument();
    expect(screen.getByText('Date Welded')).toBeInTheDocument();
    expect(screen.getByText('NDE Type')).toBeInTheDocument();
    expect(screen.getByText('NDE Result')).toBeInTheDocument();
    expect(screen.getByText('NDE Date')).toBeInTheDocument();
  });

  it('should render weld data in rows', () => {
    render(<WeldLogTable welds={mockWeldLogEntries} />);

    // Check all weld numbers are present
    expect(screen.getByText('W-001')).toBeInTheDocument();
    expect(screen.getByText('W-002')).toBeInTheDocument();
    expect(screen.getByText('W-003')).toBeInTheDocument();

    // Check welder names (John Doe appears twice for weld-1 and weld-3)
    const johnDoeElements = screen.getAllByText('John Doe');
    expect(johnDoeElements).toHaveLength(2);
    expect(screen.getByText('Not Assigned')).toBeInTheDocument();

    // Check dates
    expect(screen.getByText('11/15/2025')).toBeInTheDocument();
    expect(screen.getByText('11/18/2025')).toBeInTheDocument();
    expect(screen.getByText('11/16/2025')).toBeInTheDocument();
    expect(screen.getByText('11/20/2025')).toBeInTheDocument();
    expect(screen.getByText('11/19/2025')).toBeInTheDocument();

    // Check NDE types
    expect(screen.getByText('RT')).toBeInTheDocument();
    expect(screen.getByText('UT')).toBeInTheDocument();
    expect(screen.getByText('PT')).toBeInTheDocument();

    // Check NDE results
    expect(screen.getByText('PASS')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('FAIL')).toBeInTheDocument();
  });

  it('should render empty state when no welds provided', () => {
    render(<WeldLogTable welds={[]} />);

    expect(screen.getByText('No welds found')).toBeInTheDocument();
    expect(screen.getByText('No welds have been created for this drawing yet.')).toBeInTheDocument();
  });

  it('should display PASS results with green styling', () => {
    render(<WeldLogTable welds={[mockWeldLogEntries[0]]} />);

    const passElement = screen.getByText('PASS');
    expect(passElement).toBeInTheDocument();
    expect(passElement).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('should display FAIL results with red styling', () => {
    render(<WeldLogTable welds={[mockWeldLogEntries[2]]} />);

    const failElement = screen.getByText('FAIL');
    expect(failElement).toBeInTheDocument();
    expect(failElement).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('should display PENDING results with yellow styling', () => {
    render(<WeldLogTable welds={[mockWeldLogEntries[1]]} />);

    const pendingElement = screen.getByText('PENDING');
    expect(pendingElement).toBeInTheDocument();
    expect(pendingElement).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('should handle null welder_name', () => {
    render(<WeldLogTable welds={[mockWeldLogEntries[1]]} />);

    expect(screen.getByText('Not Assigned')).toBeInTheDocument();
  });

  it('should handle null nde_date', () => {
    render(<WeldLogTable welds={[mockWeldLogEntries[1]]} />);

    // Find the NDE Date column cells
    const tableCells = screen.getAllByRole('cell');
    const ndeDateCell = tableCells.find(cell => cell.textContent === '-');
    expect(ndeDateCell).toBeInTheDocument();
  });

  it('should format dates correctly', () => {
    render(<WeldLogTable welds={[mockWeldLogEntries[0]]} />);

    // Check Date Welded: 2025-11-15 -> 11/15/2025
    expect(screen.getByText('11/15/2025')).toBeInTheDocument();

    // Check NDE Date: 2025-11-20 -> 11/20/2025
    expect(screen.getByText('11/20/2025')).toBeInTheDocument();
  });

  it('should render correct number of rows', () => {
    render(<WeldLogTable welds={mockWeldLogEntries} />);

    // Should have 3 data rows (excluding header)
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4); // 1 header + 3 data rows
  });
});
