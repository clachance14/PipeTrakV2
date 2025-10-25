/**
 * CreateProjectPage - Project creation form (Feature 013)
 *
 * Provides a dedicated page for creating new projects with client-side validation.
 * On successful creation, auto-selects the new project and navigates to home.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCreateProject } from '@/hooks/useProjects'
import { useProject } from '@/contexts/ProjectContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Layout } from '@/components/Layout'

interface FormErrors {
  name?: string
  description?: string
}

export function CreateProjectPage() {
  const navigate = useNavigate()
  const { setSelectedProjectId } = useProject()
  const { mutate: createProject, isPending } = useCreateProject()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!name.trim()) {
      newErrors.name = 'Project name is required'
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    createProject(
      { name: name.trim(), description: description.trim() },
      {
        onSuccess: (newProject) => {
          setSelectedProjectId(newProject.id)
          navigate('/')
        },
        onError: (error) => {
          toast.error(`Failed to create project: ${error.message}`)
        },
      }
    )
  }

  const handleCancel = () => {
    navigate('/')
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>
              Add a new construction project to start tracking components and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name Field */}
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Downtown Pipeline Installation"
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the project scope and objectives"
                  rows={4}
                  aria-required="true"
                  aria-invalid={!!errors.description}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-500" role="alert">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
