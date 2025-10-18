import { useState } from 'react';
import { ReviewItem } from './ReviewItemCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface ResolveReviewModalProps {
  item: ReviewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (status: 'resolved' | 'ignored', note?: string) => void;
}

/**
 * Modal dialog for resolving or ignoring a review item
 * Allows optional resolution note
 */
export function ResolveReviewModal({ item, isOpen, onClose, onSubmit }: ResolveReviewModalProps) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (status: 'resolved' | 'ignored') => {
    setIsSubmitting(true);
    try {
      await onSubmit(status, note.trim() || undefined);
      setNote('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resolve Review Item</DialogTitle>
          <DialogDescription>
            Choose how to handle this flagged item and optionally add a resolution note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item details */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-1">{item.description}</p>
            <p className="text-xs text-muted-foreground">
              Created: {new Date(item.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Resolution note */}
          <div className="space-y-2">
            <Label htmlFor="resolution-note">Resolution Note (optional)</Label>
            <Textarea
              id="resolution-note"
              placeholder="Add any notes about how you handled this issue..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {note.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit('ignored')}
            disabled={isSubmitting}
          >
            Ignore
          </Button>
          <Button
            onClick={() => handleSubmit('resolved')}
            disabled={isSubmitting}
          >
            Resolve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
