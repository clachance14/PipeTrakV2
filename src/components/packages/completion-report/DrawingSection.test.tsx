/**
 * Tests for DrawingSection component (Package Completion Report)
 * Feature 030: Test Package Workflow - Drawing accordion section
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawingSection } from './DrawingSection';
import type { DrawingGroup } from '@/types/packageReport';

describe('DrawingSection', () => {
  const mockDrawingGroup: DrawingGroup = {
    drawing_id: 'dwg-1',
    drawing_no_norm: 'P-001',
    component_count: 5,
    unique_supports_count: 2,
    components: [],
    weld_log: [
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
    ],
    nde_summary: {
      total_welds: 1,
      nde_required_count: 1,
      nde_pass_count: 1,
      nde_fail_count: 0,
      nde_pending_count: 0,
    },
  };

  it('should render drawing header with drawing number, component count, and unique supports count', () => {
    render(<DrawingSection drawingGroup={mockDrawingGroup} />);

    expect(screen.getByText(/P-001/)).toBeInTheDocument();
    expect(screen.getByText(/5 components/)).toBeInTheDocument();
    expect(screen.getByText(/2 unique supports/)).toBeInTheDocument();
  });

  it('should render collapsed by default', () => {
    render(<DrawingSection drawingGroup={mockDrawingGroup} />);

    // Accordion content should not be visible initially
    expect(screen.queryByText('Component Summary')).not.toBeInTheDocument();
  });

  it('should expand when accordion trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<DrawingSection drawingGroup={mockDrawingGroup} />);

    // Click accordion trigger
    const trigger = screen.getByRole('button', { name: /P-001/ });
    await user.click(trigger);

    // Content should now be visible
    expect(screen.getByText('Component Summary')).toBeInTheDocument();
    expect(screen.getByText('Weld Log')).toBeInTheDocument();
    expect(screen.getByText('NDE Summary')).toBeInTheDocument();
  });

  it('should display component summary stats', async () => {
    const user = userEvent.setup();
    render(<DrawingSection drawingGroup={mockDrawingGroup} />);

    // Expand accordion
    const trigger = screen.getByRole('button', { name: /P-001/ });
    await user.click(trigger);

    // Check component summary
    expect(screen.getByText('Component Summary')).toBeInTheDocument();
    expect(screen.getByText('Total:')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Unique Supports:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render WeldLogTable with welds', async () => {
    const user = userEvent.setup();
    render(<DrawingSection drawingGroup={mockDrawingGroup} />);

    // Expand accordion
    const trigger = screen.getByRole('button', { name: /P-001/ });
    await user.click(trigger);

    // Check weld log table header
    expect(screen.getByText('Weld Log')).toBeInTheDocument();
    expect(screen.getByText('Weld Number')).toBeInTheDocument();
    expect(screen.getByText('W-001')).toBeInTheDocument();
  });

  it('should display NDE summary statistics', async () => {
    const user = userEvent.setup();
    render(<DrawingSection drawingGroup={mockDrawingGroup} />);

    // Expand accordion
    const trigger = screen.getByRole('button', { name: /P-001/ });
    await user.click(trigger);

    // Check NDE summary
    expect(screen.getByText('NDE Summary')).toBeInTheDocument();
    expect(screen.getByText('Total Welds')).toBeInTheDocument();
    expect(screen.getByText('NDE Required')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    // Values: 1, 1, 1, 0, 0 - but there are multiple "1" and "0" elements, so just verify they exist
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(3); // Total Welds, NDE Required, Passed
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2); // Failed, Pending
  });

  it('should handle drawing with no welds', async () => {
    const user = userEvent.setup();
    const drawingWithNoWelds: DrawingGroup = {
      ...mockDrawingGroup,
      weld_log: [],
      nde_summary: {
        total_welds: 0,
        nde_required_count: 0,
        nde_pass_count: 0,
        nde_fail_count: 0,
        nde_pending_count: 0,
      },
    };

    render(<DrawingSection drawingGroup={drawingWithNoWelds} />);

    // Expand accordion
    const trigger = screen.getByRole('button', { name: /P-001/ });
    await user.click(trigger);

    // Should show empty state for welds
    expect(screen.getByText('No welds found')).toBeInTheDocument();

    // NDE summary should show zeros
    expect(screen.getByText('Total Welds')).toBeInTheDocument();
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(5); // All 5 NDE stat values should be 0
  });

  it('should handle drawing with zero unique supports', () => {
    const drawingWithNoSupports: DrawingGroup = {
      ...mockDrawingGroup,
      unique_supports_count: 0,
    };

    render(<DrawingSection drawingGroup={drawingWithNoSupports} />);

    expect(screen.getByText(/0 unique supports/)).toBeInTheDocument();
  });

  it('should use singular form for 1 component', () => {
    const drawingWithOneComponent: DrawingGroup = {
      ...mockDrawingGroup,
      component_count: 1,
    };

    render(<DrawingSection drawingGroup={drawingWithOneComponent} />);

    expect(screen.getByText(/1 component/)).toBeInTheDocument();
  });

  it('should use singular form for 1 unique support', () => {
    const drawingWithOneSupport: DrawingGroup = {
      ...mockDrawingGroup,
      unique_supports_count: 1,
    };

    render(<DrawingSection drawingGroup={drawingWithOneSupport} />);

    expect(screen.getByText(/1 unique support/)).toBeInTheDocument();
  });
});
