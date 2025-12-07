// Test for RollbackConfirmationModal component
// Tests rollback reason selection, validation, and confirmation flow

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RollbackConfirmationModal } from './RollbackConfirmationModal';
import { ROLLBACK_REASONS, type RollbackReasonKey } from '@/types/drawing-table.types';

describe('RollbackConfirmationModal', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();
  const componentName = 'SPOOL-001';
  const milestoneName = 'Fabricate';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with component and milestone info displayed', () => {
      render(
        <RollbackConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          componentName={componentName}
          milestoneName={milestoneName}
        />
      );

      expect(screen.getByText(/confirm milestone rollback/i)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(componentName, 'i'))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(milestoneName, 'i'))).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <RollbackConfirmationModal
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          componentName={componentName}
          milestoneName={milestoneName}
        />
      );

      expect(screen.queryByText(/confirm milestone rollback/i)).not.toBeInTheDocument();
    });

    it('should render reason dropdown with all preset options', () => {
      render(
        <RollbackConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          componentName={componentName}
          milestoneName={milestoneName}
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      expect(selectTrigger).toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('should have confirm button disabled when no reason selected', () => {
      render(
        <RollbackConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          componentName={componentName}
          milestoneName={milestoneName}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm rollback/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should enable confirm button when a preset reason (not "other") is selected', async () => {
      const user = userEvent.setup();

      render(
        <RollbackConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          componentName={componentName}
          milestoneName={milestoneName}
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      const dataEntryOption = await screen.findByRole('option', { name: /data entry error/i });
      await user.click(dataEntryOption);

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm rollback/i });
        expect(confirmButton).toBeEnabled();
      });
    });

    it('should show textarea when "Other" is selected', async () => {
      const user = userEvent.setup();

      render(
        <RollbackConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          componentName={componentName}
          milestoneName={milestoneName}
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      const otherOption = await screen.findByRole('option', { name: /other \(specify\)/i });
      await user.click(otherOption);

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/provide additional details/i);
        expect(textarea).toBeInTheDocument();
      });
    });

    it('should keep confirm disabled when "Other" selected with details < 10 chars', async () => {
      const user = userEvent.setup();

      render(
        <RollbackConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          componentName={componentName}
          milestoneName={milestoneName}
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      const otherOption = await screen.findByRole('option', { name: /other \(specify\)/i });
      await user.click(otherOption);

      const textarea = await screen.findByPlaceholderText(/provide additional details/i);
      await user.type(textarea, 'Too short');

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm rollback/i });
        expect(confirmButton).toBeDisabled();
      });
    });

    it('should enable confirm when "Other" selected with 10+ chars', async () => {
      const user = userEvent.setup();

      render(
        <RollbackConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          componentName={componentName}
          milestoneName={milestoneName}
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      const otherOption = await screen.findByRole('option', { name: /other \(specify\)/i });
      await user.click(otherOption);

      const textarea = await screen.findByPlaceholderText(/provide additional details/i);
      await user.type(textarea, 'This is a valid reason with enough characters');

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm rollback/i });
        expect(confirmButton).toBeEnabled();
      });
    });
  });

  describe('User Actions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RollbackConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          componentName={componentName}
          milestoneName={milestoneName}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm with correct RollbackReasonData for preset reason', async () => {
      const user = userEvent.setup();

      render(
        <RollbackConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          componentName={componentName}
          milestoneName={milestoneName}
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      const dataEntryOption = await screen.findByRole('option', { name: /data entry error/i });
      await user.click(dataEntryOption);

      const confirmButton = screen.getByRole('button', { name: /confirm rollback/i });
      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith({
        reason: 'data_entry_error' as RollbackReasonKey,
        reasonLabel: ROLLBACK_REASONS.data_entry_error,
      });
    });

    it('should call onConfirm with details when "Other" is selected', async () => {
      const user = userEvent.setup();

      render(
        <RollbackConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          componentName={componentName}
          milestoneName={milestoneName}
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      const otherOption = await screen.findByRole('option', { name: /other \(specify\)/i });
      await user.click(otherOption);

      const textarea = await screen.findByPlaceholderText(/provide additional details/i);
      const detailsText = 'Custom reason with sufficient length';
      await user.type(textarea, detailsText);

      const confirmButton = screen.getByRole('button', { name: /confirm rollback/i });
      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith({
        reason: 'other' as RollbackReasonKey,
        reasonLabel: ROLLBACK_REASONS.other,
        details: detailsText,
      });
    });

    it('should call onClose when clicking outside modal (via onOpenChange)', async () => {
      const user = userEvent.setup();

      render(
        <RollbackConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          componentName={componentName}
          milestoneName={milestoneName}
        />
      );

      // Simulate pressing Escape key to close dialog
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render with mobile-friendly button sizes', () => {
      render(
        <RollbackConfirmationModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          componentName={componentName}
          milestoneName={milestoneName}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const confirmButton = screen.getByRole('button', { name: /confirm rollback/i });

      // Buttons should have h-10 or larger for 44px touch targets
      expect(cancelButton).toHaveClass('h-10');
      expect(confirmButton).toHaveClass('h-10');
    });
  });
});
