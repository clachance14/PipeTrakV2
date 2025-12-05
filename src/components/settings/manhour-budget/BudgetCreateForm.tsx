/**
 * BudgetCreateForm component (Feature 032 - US1)
 * Form for creating a new manhour budget with validation
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateManhourBudget } from '@/hooks/useManhourBudget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Type for the RPC response (matches CreateManhourBudgetResponse from useManhourBudget)
interface CreateBudgetResult {
  success: boolean;
  budget_id?: string;
  version_number?: number;
  distribution_summary?: {
    total_components: number;
    components_allocated: number;
    components_with_warnings: number;
    total_weight: number;
    total_allocated_mh: number;
  };
  warnings?: Array<{
    component_id: string;
    message: string;
  }>;
  error?: string;
  message?: string;
}

// Zod schema for budget creation form
const budgetFormSchema = z.object({
  totalBudgetedManhours: z
    .number()
    .positive({ message: 'Total manhours must be greater than 0' }),
  revisionReason: z
    .string()
    .min(1, { message: 'Revision reason is required' })
    .max(500, { message: 'Revision reason must be 500 characters or less' })
    .trim(),
  effectiveDate: z.string().min(1, { message: 'Effective date is required' }),
});

export type BudgetFormData = z.infer<typeof budgetFormSchema>;

export interface BudgetCreateFormProps {
  projectId: string;
  onSuccess?: (result: CreateBudgetResult) => void;
  onCancel?: () => void;
}

export function BudgetCreateForm({
  projectId,
  onSuccess,
  onCancel,
}: BudgetCreateFormProps) {
  const createBudgetMutation = useCreateManhourBudget();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema),
    mode: 'onChange', // Real-time validation
    defaultValues: {
      totalBudgetedManhours: undefined,
      revisionReason: '',
      effectiveDate: new Date().toISOString().split('T')[0], // Today's date
    },
  });

  const onSubmit = async (data: BudgetFormData) => {
    try {
      const result = await createBudgetMutation.mutateAsync({
        projectId,
        totalBudgetedManhours: data.totalBudgetedManhours,
        revisionReason: data.revisionReason,
        effectiveDate: data.effectiveDate,
      });

      if (result.success) {
        toast.success(
          `Budget v${result.version_number ?? 1} created successfully. Allocated manhours to ${result.distribution_summary?.components_allocated ?? 0} components.`
        );
        onSuccess?.(result);
      } else {
        toast.error(result.error || 'Failed to create budget');
      }
    } catch (error: unknown) {
      const err = error as Error;
      // Handle specific error cases
      if (err.message?.includes('UNAUTHORIZED')) {
        toast.error('You do not have permission to create budgets');
      } else if (err.message?.includes('NO_COMPONENTS')) {
        toast.error('Project has no components to budget');
      } else if (err.message?.includes('ZERO_WEIGHT')) {
        toast.error('No components with calculable weights found');
      } else {
        toast.error(err.message || 'Failed to create budget');
      }
    }
  };

  const isPending = createBudgetMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Total Budgeted Manhours */}
      <div className="space-y-2">
        <Label htmlFor="totalBudgetedManhours">
          Total Budgeted Manhours <span className="text-destructive">*</span>
        </Label>
        <Input
          id="totalBudgetedManhours"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="e.g., 1250.00"
          {...register('totalBudgetedManhours', { valueAsNumber: true })}
          disabled={isPending}
        />
        {errors.totalBudgetedManhours && (
          <p className="text-sm text-destructive">
            {errors.totalBudgetedManhours.message}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Total manhours will be distributed across all non-retired components based on their calculated weights.
        </p>
      </div>

      {/* Revision Reason */}
      <div className="space-y-2">
        <Label htmlFor="revisionReason">
          Revision Reason <span className="text-destructive">*</span>
        </Label>
        <Input
          id="revisionReason"
          type="text"
          placeholder='e.g., "Original estimate" or "Change order #CO-042"'
          {...register('revisionReason')}
          disabled={isPending}
          maxLength={500}
        />
        {errors.revisionReason && (
          <p className="text-sm text-destructive">
            {errors.revisionReason.message}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Explain why this budget is being created (max 500 characters).
        </p>
      </div>

      {/* Effective Date */}
      <div className="space-y-2">
        <Label htmlFor="effectiveDate">
          Effective Date <span className="text-destructive">*</span>
        </Label>
        <Input
          id="effectiveDate"
          type="date"
          {...register('effectiveDate')}
          disabled={isPending}
        />
        {errors.effectiveDate && (
          <p className="text-sm text-destructive">
            {errors.effectiveDate.message}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Date when this budget takes effect (defaults to today).
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="min-h-[44px] min-w-[100px]" // Mobile-first: ≥44px touch target
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending || isSubmitting}
          className="min-h-[44px] min-w-[100px]" // Mobile-first: ≥44px touch target
        >
          {isPending ? 'Creating Budget...' : 'Create Budget'}
        </Button>
      </div>
    </form>
  );
}
