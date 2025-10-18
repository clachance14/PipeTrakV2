/**
 * AreaForm component (Feature 007)
 * Form for creating/editing areas with react-hook-form + Zod validation
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateArea, useUpdateArea } from '@/hooks/useAreas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Zod schema for area form data
const areaFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Area name is required')
    .max(50, 'Area name must be 50 characters or less')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional(),
});

export type AreaFormData = z.infer<typeof areaFormSchema>;

interface AreaFormProps {
  projectId: string;
  areaId?: string; // If provided, form is in edit mode
  initialData?: AreaFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AreaForm({
  projectId,
  areaId,
  initialData,
  onSuccess,
  onCancel,
}: AreaFormProps) {
  const createAreaMutation = useCreateArea();
  const updateAreaMutation = useUpdateArea();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AreaFormData>({
    resolver: zodResolver(areaFormSchema),
    mode: 'onChange', // Real-time validation
    defaultValues: initialData || {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: AreaFormData) => {
    try {
      if (areaId) {
        // Update existing area
        await updateAreaMutation.mutateAsync({
          id: areaId,
          name: data.name,
          description: data.description || undefined,
        });
        toast.success('Area updated successfully');
      } else {
        // Create new area
        await createAreaMutation.mutateAsync({
          project_id: projectId,
          name: data.name,
          description: data.description || undefined,
        });
        toast.success('Area created successfully');
      }

      onSuccess?.();
    } catch (error: any) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        toast.error('An area with this name already exists in this project');
      } else {
        toast.error(error.message || 'Failed to save area');
      }
    }
  };

  const isPending = createAreaMutation.isPending || updateAreaMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Area Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., Area 100"
          {...register('name')}
          disabled={isPending}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Optional description (max 500 characters)"
          {...register('description')}
          disabled={isPending}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending || isSubmitting}>
          {isPending ? 'Saving...' : areaId ? 'Update Area' : 'Create Area'}
        </Button>
      </div>
    </form>
  );
}
