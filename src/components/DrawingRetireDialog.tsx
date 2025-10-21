/**
 * DrawingRetireDialog component (Feature 007)
 * Dialog for retiring a drawing with reason
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRetireDrawing } from '@/hooks/useDrawings';
import { toast } from 'sonner';

const retireDrawingSchema = z.object({
  retire_reason: z
    .string()
    .min(10, 'Retire reason must be at least 10 characters')
    .trim(),
});

type RetireDrawingFormData = z.infer<typeof retireDrawingSchema>;

interface DrawingRetireDialogProps {
  drawingId: string;
  drawingNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DrawingRetireDialog({
  drawingId,
  drawingNumber,
  open,
  onOpenChange,
  onSuccess,
}: DrawingRetireDialogProps) {
  const retireMutation = useRetireDrawing();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RetireDrawingFormData>({
    resolver: zodResolver(retireDrawingSchema),
    defaultValues: {
      retire_reason: '',
    },
  });

  const onSubmit = async (data: RetireDrawingFormData) => {
    try {
      await retireMutation.mutateAsync({
        id: drawingId,
        retire_reason: data.retire_reason,
      });

      toast.success(`Drawing ${drawingNumber} retired successfully`);
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to retire drawing');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retire Drawing</DialogTitle>
          <DialogDescription>
            Retire drawing <strong>{drawingNumber}</strong>. Components will retain their
            reference to this drawing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="retire_reason">
              Retire Reason <span className="text-destructive">*</span>
            </Label>
            <Input
              id="retire_reason"
              placeholder="e.g., Superseded by Rev-B, issued 2025-10-16"
              {...register('retire_reason')}
              disabled={retireMutation.isPending}
            />
            {errors.retire_reason && (
              <p className="text-sm text-destructive">{errors.retire_reason.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters required
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={retireMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={retireMutation.isPending}>
              {retireMutation.isPending ? 'Retiring...' : 'Retire Drawing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
