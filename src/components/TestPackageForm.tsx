/**
 * TestPackageForm component (Feature 007)
 * Form for creating/editing test packages with react-hook-form + Zod validation
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateTestPackage, useUpdateTestPackage } from '@/hooks/useTestPackages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Zod schema for test package form data
const testPackageFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Test package name is required')
    .max(100, 'Test package name must be 100 characters or less')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional(),
  target_date: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val) return true; // Allow null/empty
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Invalid date format' }
    ),
});

export type TestPackageFormData = z.infer<typeof testPackageFormSchema>;

interface TestPackageFormProps {
  projectId: string;
  testPackageId?: string; // If provided, form is in edit mode
  initialData?: TestPackageFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TestPackageForm({
  projectId,
  testPackageId,
  initialData,
  onSuccess,
  onCancel,
}: TestPackageFormProps) {
  const createTestPackageMutation = useCreateTestPackage();
  const updateTestPackageMutation = useUpdateTestPackage();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<TestPackageFormData>({
    resolver: zodResolver(testPackageFormSchema),
    mode: 'onChange', // Real-time validation
    defaultValues: initialData || {
      name: '',
      description: '',
      target_date: '',
    },
  });

  const targetDate = watch('target_date');
  const isTargetDateInPast =
    targetDate && new Date(targetDate) < new Date() ? true : false;

  const onSubmit = async (data: TestPackageFormData) => {
    try {
      if (testPackageId) {
        // Update existing test package
        await updateTestPackageMutation.mutateAsync({
          id: testPackageId,
          name: data.name,
          description: data.description || undefined,
          target_date: data.target_date || undefined,
        });
        toast.success('Test package updated successfully');
      } else {
        // Create new test package
        await createTestPackageMutation.mutateAsync({
          project_id: projectId,
          name: data.name,
          description: data.description || undefined,
          target_date: data.target_date || undefined,
        });
        toast.success('Test package created successfully');
      }

      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save test package');
    }
  };

  const isPending =
    createTestPackageMutation.isPending || updateTestPackageMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Test Package Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., TP-2025-001"
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

      <div className="space-y-2">
        <Label htmlFor="target_date">Target Date</Label>
        <Input
          id="target_date"
          type="date"
          {...register('target_date')}
          disabled={isPending}
        />
        {errors.target_date && (
          <p className="text-sm text-destructive">{errors.target_date.message}</p>
        )}
        {isTargetDateInPast && !errors.target_date && (
          <p className="text-sm text-yellow-600">
            Warning: Target date is in the past
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending || isSubmitting}>
          {isPending
            ? 'Saving...'
            : testPackageId
              ? 'Update Test Package'
              : 'Create Test Package'}
        </Button>
      </div>
    </form>
  );
}
