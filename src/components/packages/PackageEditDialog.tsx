/**
 * Component: PackageEditDialog
 * Feature: 012-test-package-readiness
 *
 * Dialog for creating or editing test packages.
 * Supports create mode (empty form) and edit mode (pre-filled).
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreatePackage, useUpdatePackage } from '@/hooks/usePackages';
import type { Package } from '@/types/package.types';

interface PackageEditDialogProps {
  /** Dialog mode: create or edit */
  mode: 'create' | 'edit';
  /** Project ID for package creation */
  projectId: string;
  /** Package to edit (required for edit mode) */
  package?: Package;
  /** Whether dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
}

export function PackageEditDialog({
  mode,
  projectId,
  package: pkg,
  open,
  onOpenChange,
}: PackageEditDialogProps) {
  const createMutation = useCreatePackage(projectId);
  const updateMutation = useUpdatePackage(projectId);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Reset form when dialog opens or mode/package changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && pkg) {
        setName(pkg.name);
        setDescription(pkg.description || '');
        setTargetDate(pkg.target_date || '');
      } else {
        setName('');
        setDescription('');
        setTargetDate('');
      }
    }
  }, [open, mode, pkg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Name required
    const trimmedName = name.trim();
    if (!trimmedName) {
      return; // Form validation will show error
    }

    if (mode === 'create') {
      createMutation.mutate(
        {
          p_project_id: projectId,
          p_name: trimmedName,
          p_description: description.trim() || null,
          p_target_date: targetDate || null,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else if (pkg) {
      updateMutation.mutate(
        {
          p_package_id: pkg.id,
          p_name: trimmedName,
          p_description: description.trim() || null,
          p_target_date: targetDate || null,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const characterCount = description.length;
  const maxCharacters = 100;
  const isDescriptionTooLong = characterCount > maxCharacters;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Test Package' : 'Edit Test Package'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new test package to organize components for turnover.'
              : 'Update package details. Changes will be saved immediately.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Package Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Package Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter package name..."
                required
                disabled={isLoading}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
                rows={3}
                disabled={isLoading}
                className={isDescriptionTooLong ? 'border-red-500' : ''}
              />
              <div className="flex items-center justify-between text-sm">
                <span
                  className={isDescriptionTooLong ? 'text-red-500' : 'text-gray-500'}
                >
                  {characterCount}/{maxCharacters} characters
                </span>
                {isDescriptionTooLong && (
                  <span className="text-red-500 text-xs">
                    Description too long
                  </span>
                )}
              </div>
            </div>

            {/* Target Date */}
            <div className="grid gap-2">
              <Label htmlFor="targetDate">Target Date (optional)</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim() || isDescriptionTooLong}
            >
              {isLoading
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Saving...'
                : mode === 'create'
                ? 'Create Package'
                : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
