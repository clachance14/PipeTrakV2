// T049: RemoveMemberDialog component
// Radix AlertDialog with "Are you sure?" confirmation
// Triggers removeMemberMutation with optimistic updates

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useOrganization } from '@/hooks/useOrganization';
import type { TeamMember } from '@/types/team.types';

interface RemoveMemberDialogProps {
  member: TeamMember;
  organizationId: string;
  trigger: React.ReactNode;
  onRemoveSuccess?: (userId: string) => void;
}

export function RemoveMemberDialog({
  member,
  organizationId,
  trigger,
  onRemoveSuccess,
}: RemoveMemberDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { removeMemberMutation } = useOrganization();

  const handleRemove = () => {
    removeMemberMutation.mutate(
      {
        userId: member.user_id,
        organizationId,
      },
      {
        onSuccess: () => {
          setOpen(false);
          onRemoveSuccess?.(member.user_id);
        },
        onError: () => {
          // Error handling already done in mutation (toast + rollback)
          setOpen(false);
        },
      }
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{member.name}</strong> ({member.email}) from
            this organization? This action cannot be undone. They will immediately lose access to
            all organization resources.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeMemberMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleRemove();
            }}
            disabled={removeMemberMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {removeMemberMutation.isPending ? 'Removing...' : 'Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
