/**
 * MetadataDescriptionEditor Component
 * Feature: 011-the-drawing-component
 *
 * Quick-edit popover for editing area/system/test_package descriptions.
 * Triggered by pencil icon in select dropdowns.
 *
 * Features:
 * - Character counter (max 100 chars)
 * - Save/Cancel buttons
 * - Optimistic updates with rollback
 * - Toast notifications
 */

import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useUpdateArea } from '@/hooks/useAreas';
import { useUpdateSystem } from '@/hooks/useSystems';
import { useUpdateTestPackage } from '@/hooks/useTestPackages';
import { toast } from 'sonner';

interface MetadataDescriptionEditorProps {
  /** Type of metadata entity */
  entityType: 'area' | 'system' | 'test_package';
  /** UUID of the entity */
  entityId: string;
  /** Entity name (for display in title) */
  entityName: string;
  /** Current description (null if none) */
  currentDescription: string | null;
  /** Callback after successful save (optional) */
  onSave?: () => void;
}

const MAX_DESCRIPTION_LENGTH = 100;

export function MetadataDescriptionEditor({
  entityType,
  entityId,
  entityName,
  currentDescription,
  onSave,
}: MetadataDescriptionEditorProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(currentDescription || '');
  const [isSaving, setIsSaving] = useState(false);

  // Select the appropriate mutation hook based on entity type
  const updateAreaMutation = useUpdateArea();
  const updateSystemMutation = useUpdateSystem();
  const updateTestPackageMutation = useUpdateTestPackage();

  // Reset description when popover opens
  useEffect(() => {
    if (open) {
      setDescription(currentDescription || '');
    }
  }, [open, currentDescription]);

  const handleSave = async () => {
    // Validate length
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      toast.error(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
      return;
    }

    setIsSaving(true);

    try {
      const trimmedDescription = description.trim();
      const updatePayload = {
        id: entityId,
        description: trimmedDescription || undefined, // Empty string = undefined (hooks expect undefined, not null)
      };

      // Call the appropriate mutation
      if (entityType === 'area') {
        await updateAreaMutation.mutateAsync(updatePayload);
        toast.success(`Area description updated`);
      } else if (entityType === 'system') {
        await updateSystemMutation.mutateAsync(updatePayload);
        toast.success(`System description updated`);
      } else if (entityType === 'test_package') {
        await updateTestPackageMutation.mutateAsync(updatePayload);
        toast.success(`Test package description updated`);
      }

      setOpen(false);
      onSave?.();
    } catch (error) {
      toast.error(`Failed to update description: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDescription(currentDescription || '');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const charCount = description.length;
  const isOverLimit = charCount > MAX_DESCRIPTION_LENGTH;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-slate-100"
          onClick={(e) => {
            e.stopPropagation(); // Prevent select dropdown from closing
            setOpen(true);
          }}
        >
          <Pencil className="h-3 w-3 text-slate-500" />
          <span className="sr-only">Edit description</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling
        onPointerDown={(e) => e.stopPropagation()} // Prevent Radix Select from closing
      >
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm">Edit Description</h4>
            <p className="text-xs text-slate-500 mt-1">{entityName}</p>
          </div>

          <div className="space-y-2">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter description (optional)"
              maxLength={MAX_DESCRIPTION_LENGTH + 10} // Allow typing past limit to show error
              className={isOverLimit ? 'border-red-500' : ''}
              disabled={isSaving}
              autoFocus
            />
            <div
              className={`text-xs text-right ${
                isOverLimit ? 'text-red-500 font-medium' : 'text-slate-500'
              }`}
            >
              {charCount}/{MAX_DESCRIPTION_LENGTH} characters
              {isOverLimit && ' (exceeds limit)'}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isOverLimit}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
