import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'

interface DeleteConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
  componentCount: number
  componentSummary: string
}

export function DeleteConfirmationDialog({
  open,
  onClose,
  onConfirm,
  componentCount,
  componentSummary,
}: DeleteConfirmationDialogProps) {
  const [reason, setReason] = useState('')

  function handleConfirm() {
    onConfirm(reason.trim() !== '' ? reason.trim() : undefined)
    setReason('')
  }

  function handleClose() {
    setReason('')
    onClose()
  }

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {componentCount} component(s)?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes them from progress tracking.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-sm">{componentSummary}</p>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. AI misextraction, duplicate, not needed"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            onClick={handleConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
