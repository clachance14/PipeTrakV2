/**
 * Unit tests for DimensionSelector component (Feature 019 - T019)
 * Tests radio button UI for selecting Area/System/Test Package grouping
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DimensionSelector } from './DimensionSelector';
import type { GroupingDimension } from '@/types/reports';

describe('DimensionSelector', () => {
  it('renders all three dimension options', () => {
    const onChange = vi.fn();
    render(<DimensionSelector value="area" onChange={onChange} />);

    expect(screen.getByLabelText('Area')).toBeInTheDocument();
    expect(screen.getByLabelText('System')).toBeInTheDocument();
    expect(screen.getByLabelText('Test Package')).toBeInTheDocument();
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
