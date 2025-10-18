import { WelderRow } from './WelderTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface VerifyWelderDialogProps {
  welder: WelderRow | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog for verifying a welder
 * Shows warning that action cannot be undone
 */
export function VerifyWelderDialog({
  welder,
  isOpen,
  onClose,
  onConfirm
}: VerifyWelderDialogProps) {
  if (!welder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Welder</DialogTitle>
          <DialogDescription>
            Are you sure you want to verify this welder?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Welder details */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Name:</span>
              <span className="text-sm text-gray-900">{welder.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Stencil:</span>
              <span className="text-sm text-gray-900 font-mono">{welder.stencil}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Weld Count:</span>
              <span className="text-sm text-gray-900">{welder.weldCount}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              ⚠️ This action cannot be undone. Once verified, the welder's status cannot be
              changed back to unverified.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm Verification</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
