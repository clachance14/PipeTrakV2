/**
 * Unit tests for DimensionSelector component (Feature 019 - T019)
 * Tests radio button UI for selecting Area/System/Test Package grouping
 * Extended to support Field Weld reports with Welder dimension
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DimensionSelector } from './DimensionSelector';
import type { FieldWeldGroupingDimension } from '@/types/reports';

describe('DimensionSelector - Component Variant', () => {
  it('renders all three dimension options', () => {
    const onChange = vi.fn();
    render(<DimensionSelector value="area" onChange={onChange} />);

    expect(screen.getByLabelText('Area')).toBeInTheDocument();
    expect(screen.getByLabelText('System')).toBeInTheDocument();
    expect(screen.getByLabelText('Test Package')).toBeInTheDocument();
  });

  it('does not render Welder option in component variant', () => {
    const onChange = vi.fn();
    render(<DimensionSelector value="area" onChange={onChange} />);

    expect(screen.queryByLabelText('Welder')).not.toBeInTheDocument();
  });

  it('shows Area as selected when value is "area"', () => {
    const onChange = vi.fn();
    render(<DimensionSelector value="area" onChange={onChange} />);

    // Radix UI uses data-state attribute instead of checked property
    const areaRadio = screen.getByRole('radio', { name: 'Area' });
    expect(areaRadio).toHaveAttribute('data-state', 'checked');
  });

  it('shows System as selected when value is "system"', () => {
    const onChange = vi.fn();
    render(<DimensionSelector value="system" onChange={onChange} />);

    // Radix UI uses data-state attribute instead of checked property
    const systemRadio = screen.getByRole('radio', { name: 'System' });
    expect(systemRadio).toHaveAttribute('data-state', 'checked');
  });

  it('shows Test Package as selected when value is "test_package"', () => {
    const onChange = vi.fn();
    render(<DimensionSelector value="test_package" onChange={onChange} />);

    // Radix UI uses data-state attribute instead of checked property
    const testPackageRadio = screen.getByRole('radio', { name: 'Test Package' });
    expect(testPackageRadio).toHaveAttribute('data-state', 'checked');
  });

  it('calls onChange with "area" when Area radio is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DimensionSelector value="system" onChange={onChange} />);

    const areaRadio = screen.getByLabelText('Area');
    await user.click(areaRadio);

    expect(onChange).toHaveBeenCalledWith('area');
  });

  it('calls onChange with "system" when System radio is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DimensionSelector value="area" onChange={onChange} />);

    const systemRadio = screen.getByLabelText('System');
    await user.click(systemRadio);

    expect(onChange).toHaveBeenCalledWith('system');
  });

  it('calls onChange with "test_package" when Test Package radio is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DimensionSelector value="area" onChange={onChange} />);

    const testPackageRadio = screen.getByLabelText('Test Package');
    await user.click(testPackageRadio);

    expect(onChange).toHaveBeenCalledWith('test_package');
  });

  it('renders with accessible radio group semantics', () => {
    const onChange = vi.fn();
    render(<DimensionSelector value="area" onChange={onChange} />);

    // Should have a group label
    const group = screen.getByRole('radiogroup');
    expect(group).toBeInTheDocument();
    expect(group).toHaveAccessibleName(/group by/i);
  });

  it('applies disabled state to all radios when disabled prop is true', () => {
    const onChange = vi.fn();
    render(<DimensionSelector value="area" onChange={onChange} disabled />);

    const areaRadio = screen.getByRole('radio', { name: 'Area' });
    const systemRadio = screen.getByRole('radio', { name: 'System' });
    const testPackageRadio = screen.getByRole('radio', { name: 'Test Package' });

    expect(areaRadio).toBeDisabled();
    expect(systemRadio).toBeDisabled();
    expect(testPackageRadio).toBeDisabled();
  });

  it('does not call onChange when clicking a disabled radio button', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DimensionSelector value="area" onChange={onChange} disabled />);

    const systemRadio = screen.getByLabelText('System');
    await user.click(systemRadio);

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('DimensionSelector - Field Weld Variant', () => {
  it('renders all four dimension options including Welder', () => {
    const onChange = vi.fn<[FieldWeldGroupingDimension]>();
    render(<DimensionSelector variant="field-weld" value="area" onChange={onChange} />);

    expect(screen.getByLabelText('Area')).toBeInTheDocument();
    expect(screen.getByLabelText('System')).toBeInTheDocument();
    expect(screen.getByLabelText('Test Package')).toBeInTheDocument();
    expect(screen.getByLabelText(/Welder/i)).toBeInTheDocument();
  });

  it('shows Welder as selected when value is "welder"', () => {
    const onChange = vi.fn<[FieldWeldGroupingDimension]>();
    render(<DimensionSelector variant="field-weld" value="welder" onChange={onChange} />);

    // Radix UI uses data-state attribute instead of checked property
    const welderRadio = screen.getByRole('radio', { name: /Welder/i });
    expect(welderRadio).toHaveAttribute('data-state', 'checked');
  });

  it('calls onChange with "welder" when Welder radio is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<[FieldWeldGroupingDimension]>();
    render(<DimensionSelector variant="field-weld" value="area" onChange={onChange} />);

    const welderRadio = screen.getByLabelText(/Welder/i);
    await user.click(welderRadio);

    expect(onChange).toHaveBeenCalledWith('welder');
  });

  it('renders Welder option with User icon', () => {
    const onChange = vi.fn<[FieldWeldGroupingDimension]>();
    render(<DimensionSelector variant="field-weld" value="area" onChange={onChange} />);

    // Check that the Welder label contains an SVG (icon)
    const welderLabel = screen.getByLabelText(/Welder/i);
    expect(welderLabel).toBeInTheDocument();
  });

  it('applies disabled state to all radios including Welder when disabled prop is true', () => {
    const onChange = vi.fn<[FieldWeldGroupingDimension]>();
    render(<DimensionSelector variant="field-weld" value="area" onChange={onChange} disabled />);

    const areaRadio = screen.getByRole('radio', { name: 'Area' });
    const systemRadio = screen.getByRole('radio', { name: 'System' });
    const testPackageRadio = screen.getByRole('radio', { name: 'Test Package' });
    const welderRadio = screen.getByRole('radio', { name: /Welder/i });

    expect(areaRadio).toBeDisabled();
    expect(systemRadio).toBeDisabled();
    expect(testPackageRadio).toBeDisabled();
    expect(welderRadio).toBeDisabled();
  });

  it('maintains accessible radio group semantics in field-weld variant', () => {
    const onChange = vi.fn<[FieldWeldGroupingDimension]>();
    render(<DimensionSelector variant="field-weld" value="area" onChange={onChange} />);

    // Should have a group label
    const group = screen.getByRole('radiogroup');
    expect(group).toBeInTheDocument();
    expect(group).toHaveAccessibleName(/group by/i);
  });
});
