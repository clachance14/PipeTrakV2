import { useState } from 'react'
import { useWelders } from '@/hooks/useWelders'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface WelderFormProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STENCIL_REGEX = /^[A-Z0-9-]{2,12}$/

export function WelderForm({ projectId, open, onOpenChange }: WelderFormProps) {
  const [stencil, setStencil] = useState('')
  const [name, setName] = useState('')
  const [stencilError, setStencilError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  const { createWelderMutation } = useWelders({ projectId })

  const validateStencil = (value: string): boolean => {
    if (!value.trim()) {
      setStencilError('Stencil is required')
      return false
    }
    if (!STENCIL_REGEX.test(value)) {
      setStencilError('Stencil must be 2-12 characters (A-Z, 0-9, hyphen only)')
      return false
    }
    setStencilError(null)
    return true
  }

  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setNameError('Name is required')
      return false
    }
    setNameError(null)
    return true
  }

  const handleStencilChange = (value: string) => {
    setStencil(value.toUpperCase())
    if (stencilError) {
      validateStencil(value.toUpperCase())
    }
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (nameError) {
      validateName(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const isStencilValid = validateStencil(stencil)
    const isNameValid = validateName(name)

    if (!isStencilValid || !isNameValid) {
      return
    }

    try {
      await createWelderMutation.mutateAsync({
        project_id: projectId,
        stencil: stencil.trim(),
        name: name.trim(),
        status: 'unverified',
      })

      toast.success('Welder created successfully', {
        description: `${stencil} - ${name} has been added to the project`,
      })

      // Reset form and close dialog
      setStencil('')
      setName('')
      setStencilError(null)
      setNameError(null)
      onOpenChange(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create welder'
      toast.error('Error creating welder', {
        description: errorMessage,
      })
    }
  }

  const handleCancel = () => {
    setStencil('')
    setName('')
    setStencilError(null)
    setNameError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Welder</DialogTitle>
          <DialogDescription>
            Add a new welder to the project. Stencil must be unique.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Stencil Input */}
            <div className="grid gap-2">
              <Label htmlFor="stencil" className="text-sm font-medium">
                Stencil <span className="text-red-600">*</span>
              </Label>
              <Input
                id="stencil"
                type="text"
                value={stencil}
                onChange={(e) => handleStencilChange(e.target.value)}
                onBlur={() => validateStencil(stencil)}
                placeholder="e.g., K-07, R-05"
                className={stencilError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                aria-describedby={stencilError ? 'stencil-error' : undefined}
                aria-invalid={stencilError ? true : false}
              />
              {stencilError && (
                <p id="stencil-error" className="text-sm text-red-600" role="alert">
                  {stencilError}
                </p>
              )}
              <p className="text-xs text-slate-500">
                2-12 characters, uppercase letters, numbers, and hyphens only
              </p>
            </div>

            {/* Name Input */}
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => validateName(name)}
                placeholder="e.g., John Smith"
                className={nameError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                aria-describedby={nameError ? 'name-error' : undefined}
                aria-invalid={nameError ? true : false}
              />
              {nameError && (
                <p id="name-error" className="text-sm text-red-600" role="alert">
                  {nameError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="bg-gray-200 hover:bg-gray-300 text-gray-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createWelderMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createWelderMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
