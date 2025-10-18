/**
 * SystemForm component (Feature 007)
 * Form for creating/editing systems with react-hook-form + Zod validation
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateSystem, useUpdateSystem } from '@/hooks/useSystems';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Zod schema for system form data
const systemFormSchema = z.object({
  name: z
    .string()
    .min(1, 'System name is required')
    .max(50, 'System name must be 50 characters or less')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional(),
});

export type SystemFormData = z.infer<typeof systemFormSchema>;

interface SystemFormProps {
  projectId: string;
  systemId?: string; // If provided, form is in edit mode
  initialData?: SystemFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SystemForm({
  projectId,
  systemId,
  initialData,
  onSuccess,
  onCancel,
}: SystemFormProps) {
  const createSystemMutation = useCreateSystem();
  const updateSystemMutation = useUpdateSystem();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SystemFormData>({
    resolver: zodResolver(systemFormSchema),
    mode: 'onChange', // Real-time validation
    defaultValues: initialData || {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: SystemFormData) => {
    try {
      if (systemId) {
        // Update existing system
        await updateSystemMutation.mutateAsync({
          id: systemId,
          name: data.name,
          description: data.description || undefined,
        });
        toast.success('System updated successfully');
      } else {
        // Create new system
        await createSystemMutation.mutateAsync({
          project_id: projectId,
          name: data.name,
          description: data.description || undefined,
        });
        toast.success('System created successfully');
      }

      onSuccess?.();
    } catch (error: any) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        toast.error('A system with this name already exists in this project');
      } else {
        toast.error(error.message || 'Failed to save system');
      }
    }
  };

  const isPending = createSystemMutation.isPending || updateSystemMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          System Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., HVAC-01"
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
          {isPending ? 'Saving...' : systemId ? 'Update System' : 'Create System'}
        </Button>
      </div>
    </form>
  );
}
