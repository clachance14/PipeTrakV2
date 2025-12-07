import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ROLLBACK_REASONS, type RollbackReasonKey, type RollbackReasonData } from '@/types/drawing-table.types';

export interface RollbackConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: RollbackReasonData) => void;
  componentName: string;
  milestoneName: string;
}

/**
 * Confirmation modal for milestone rollback
 * Requires user to select a reason before proceeding with unchecking a milestone
 */
export function RollbackConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  componentName,
  milestoneName,
}: RollbackConfirmationModalProps) {
  const [selectedReason, setSelectedReason] = useState<RollbackReasonKey | null>(null);
  const [details, setDetails] = useState('');

  const handleClose = () => {
    // Reset state when closing
    setSelectedReason(null);
    setDetails('');
    onClose();
  };

  const handleConfirm = () => {
    if (!selectedReason) return;

    const rollbackData: RollbackReasonData = {
      reason: selectedReason,
      reasonLabel: ROLLBACK_REASONS[selectedReason],
    };

    // Include details if "other" is selected
    if (selectedReason === 'other') {
      rollbackData.details = details.trim();
    }

    onConfirm(rollbackData);
    handleClose();
  };

  // Validation logic
  const isValid = (() => {
    if (!selectedReason) return false;
    if (selectedReason === 'other') {
      return details.trim().length >= 10;
    }
    return true;
  })();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Confirm Milestone Rollback</DialogTitle>
          <DialogDescription>
            You are about to uncheck the <strong>{milestoneName}</strong> milestone for{' '}
            <strong>{componentName}</strong>. Please select a reason for this rollback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason selection */}
          <div className="space-y-2">
            <Label htmlFor="rollback-reason">Rollback Reason</Label>
            <Select
              value={selectedReason || ''}
              onValueChange={(value) => {
                setSelectedReason(value as RollbackReasonKey);
                // Clear details when switching away from "other"
                if (value !== 'other') {
                  setDetails('');
                }
              }}
            >
              <SelectTrigger id="rollback-reason" className="w-full h-10">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLLBACK_REASONS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Details textarea (only shown when "other" is selected) */}
          {selectedReason === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="rollback-details">Details (minimum 10 characters)</Label>
              <Textarea
                id="rollback-details"
                placeholder="Provide additional details about the rollback reason..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {details.length}/500 characters
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid}
            className="h-10"
          >
            Confirm Rollback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
