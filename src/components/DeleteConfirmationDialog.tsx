/**
 * DeleteConfirmationDialog component (Feature 007)
 * Generic dialog for confirming delete operations with warning
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  entityName: string;
  warningMessage?: string;
  isPending?: boolean;
}

/**
 * DeleteConfirmationDialog component
 * Reusable dialog for confirming deletions of areas, systems, test packages
 * Shows warning if entity has components assigned
 */
export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  entityName,
  warningMessage,
  isPending = false,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm">
            Are you sure you want to delete <strong>{entityName}</strong>?
          </p>

          {warningMessage && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ {warningMessage}
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
