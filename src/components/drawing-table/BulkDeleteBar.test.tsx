import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BulkDeleteBar } from './BulkDeleteBar';

describe('BulkDeleteBar', () => {
  it('renders the selection count', () => {
    render(<BulkDeleteBar selectedCount={2} onDelete={vi.fn()} />);
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('calls onDelete when Delete Selected button is clicked', async () => {
    const onDelete = vi.fn();
    render(<BulkDeleteBar selectedCount={3} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: /delete selected/i }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(<BulkDeleteBar selectedCount={0} onDelete={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
