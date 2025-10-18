import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface WelderFormData {
  name: string;
  stencil: string;
}

export interface AddWelderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WelderFormData) => Promise<void>;
}

/**
 * Modal dialog for adding a new welder
 * Validates stencil format (2-12 chars, alphanumeric + hyphens)
 * Auto-normalizes stencil to uppercase
 */
export function AddWelderModal({ isOpen, onClose, onSubmit }: AddWelderModalProps) {
  const [name, setName] = useState('');
  const [stencil, setStencil] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateStencil = (value: string): string | null => {
    if (!value) return 'Stencil is required';
    if (value.length < 2 || value.length > 12) {
      return 'Stencil must be 2-12 characters';
    }
    if (!/^[A-Za-z0-9-]+$/.test(value)) {
      return 'Stencil can only contain letters, numbers, and hyphens';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate name
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // Validate stencil
    const stencilError = validateStencil(stencil);
    if (stencilError) {
      setError(stencilError);
      return;
    }

    setIsSubmitting(true);
    try {
      // Normalize stencil to uppercase
      await onSubmit({
        name: name.trim(),
        stencil: stencil.toUpperCase().trim()
      });
      // Reset form
      setName('');
      setStencil('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add welder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setStencil('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Welder</DialogTitle>
            <DialogDescription>
              Enter the welder's name and stencil identifier. Stencil will be automatically
              converted to uppercase.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="welder-name">Name *</Label>
              <Input
                id="welder-name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Stencil field */}
            <div className="space-y-2">
              <Label htmlFor="welder-stencil">Stencil *</Label>
              <Input
                id="welder-stencil"
                type="text"
                placeholder="JD-123"
                value={stencil}
                onChange={(e) => setStencil(e.target.value)}
                disabled={isSubmitting}
                maxLength={12}
                required
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                2-12 characters, letters, numbers, and hyphens only
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Welder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
