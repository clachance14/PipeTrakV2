import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DensityToggle } from './DensityToggle';

describe('DensityToggle', () => {
  it('should render both density buttons', () => {
    const onChange = vi.fn();

    render(<DensityToggle density="comfortable" onChange={onChange} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('should highlight compact button when density is compact', () => {
    const onChange = vi.fn();

    render(<DensityToggle density="compact" onChange={onChange} />);

    const buttons = screen.getAllByRole('button');
    const compactButton = buttons.find(btn => btn.title === 'Compact view');

    expect(compactButton).toHaveClass('bg-muted');
  });

  it('should highlight comfortable button when density is comfortable', () => {
    const onChange = vi.fn();

    render(<DensityToggle density="comfortable" onChange={onChange} />);

    const buttons = screen.getAllByRole('button');
    const comfortableButton = buttons.find(btn => btn.title === 'Comfortable view');

    expect(comfortableButton).toHaveClass('bg-muted');
  });

  it('should call onChange with "compact" when compact button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DensityToggle density="comfortable" onChange={onChange} />);

    const buttons = screen.getAllByRole('button');
    const compactButton = buttons.find(btn => btn.title === 'Compact view');

    if (compactButton) {
      await user.click(compactButton);
    }

    expect(onChange).toHaveBeenCalledWith('compact');
  });

  it('should call onChange with "comfortable" when comfortable button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DensityToggle density="compact" onChange={onChange} />);

    const buttons = screen.getAllByRole('button');
    const comfortableButton = buttons.find(btn => btn.title === 'Comfortable view');

    if (comfortableButton) {
      await user.click(comfortableButton);
    }

    expect(onChange).toHaveBeenCalledWith('comfortable');
  });

  it('should have proper accessibility titles', () => {
    const onChange = vi.fn();

    render(<DensityToggle density="comfortable" onChange={onChange} />);

    const buttons = screen.getAllByRole('button');
    const compactButton = buttons.find(btn => btn.title === 'Compact view');
    const comfortableButton = buttons.find(btn => btn.title === 'Comfortable view');

    expect(compactButton).toHaveAttribute('title', 'Compact view');
    expect(comfortableButton).toHaveAttribute('title', 'Comfortable view');
  });

  it('should allow clicking the active density button (no-op)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DensityToggle density="compact" onChange={onChange} />);

    const buttons = screen.getAllByRole('button');
    const compactButton = buttons.find(btn => btn.title === 'Compact view');

    if (compactButton) {
      await user.click(compactButton);
    }

    // Should still call onChange even if already selected
    expect(onChange).toHaveBeenCalledWith('compact');
  });

  it('should render icons for both buttons', () => {
    const onChange = vi.fn();

    const { container } = render(<DensityToggle density="comfortable" onChange={onChange} />);

    // Check for SVG icons (lucide-react icons are rendered as SVGs)
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(2);
  });

  it('should have proper styling classes', () => {
    const onChange = vi.fn();

    const { container } = render(<DensityToggle density="comfortable" onChange={onChange} />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'border', 'rounded-md', 'overflow-hidden');

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      // h-11 (44px) for WCAG touch target compliance, px-3 for padding
      expect(button).toHaveClass('rounded-none', 'h-11', 'px-3');
    });
  });

  it('should have proper aria-labels for accessibility', () => {
    const onChange = vi.fn();

    render(<DensityToggle density="compact" onChange={onChange} />);

    const compactButton = screen.getByRole('button', { name: 'Compact view' });
    const comfortableButton = screen.getByRole('button', { name: 'Comfortable view' });

    expect(compactButton).toHaveAttribute('aria-pressed', 'true');
    expect(comfortableButton).toHaveAttribute('aria-pressed', 'false');
  });
});
