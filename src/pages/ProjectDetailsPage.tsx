/**
 * ProjectDetailsPage Component
 *
 * Settings page for editing project name, description, and archiving.
 * Located at: /projects/:projectId/settings/project
 *
 * Features:
 * - Edit project name (required, max 100 chars)
 * - Edit project description (optional, max 500 chars)
 * - Character counters for both fields
 * - Archive project (soft delete with confirmation dialog)
 * - Delete project (hard delete with type-to-confirm dialog)
 * - Save button disabled when form is pristine or name is empty
 * - Permission-gated (requires can_manage_project)
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { SettingsLayout } from '@/components/settings/SettingsLayout'
import { useUpdateProject } from '@/hooks/useUpdateProject'
import { useArchiveProject } from '@/hooks/useArchiveProject'
import { useDeleteProject } from '@/hooks/useDeleteProject'
import { supabase } from '@/lib/supabase'

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  // Fetch project data
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId!)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Initialize form when project loads
  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
    }
  }, [project])

  const updateProject = useUpdateProject()
  const archiveProject = useArchiveProject()
  const deleteProject = useDeleteProject()

  const isDirty = name !== project?.name || description !== (project?.description || '')

  const handleSave = () => {
    if (!projectId) return

    updateProject.mutate(
      { projectId, name, description: description || null },
      {
        onSuccess: () => {
          // Success - mutation hook will handle cache invalidation
        },
      }
    )
  }

  const handleArchive = () => {
    if (!projectId) return

    archiveProject.mutate(projectId, {
      onSuccess: () => {
        navigate('/dashboard')
      },
    })
  }

  const handleDelete = () => {
    if (!projectId) return

    deleteProject.mutate(projectId, {
      onSuccess: () => {
        toast.success('Project deleted permanently')
        navigate('/dashboard')
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to delete project')
      },
    })
  }

  if (isLoading) {
    return (
      <SettingsLayout
        title="Project Details"
        description="Edit project information and manage project lifecycle"
      >
        <div>Loading...</div>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout
      title="Project Details"
      description="Edit project information and manage project lifecycle"
    >
      {/* Basic Information Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Project Name <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">{name.length}/100 characters</p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">{description.length}/500 characters</p>
          </div>

          <button
            onClick={handleSave}
            disabled={!isDirty || !name.trim() || updateProject.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {updateProject.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-red-600 mb-1">Danger Zone</h2>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-900">Archive Project</p>
              <p className="text-sm text-slate-500">Hide from active lists. Data is preserved and can be restored.</p>
            </div>
            <button
              onClick={() => setShowArchiveDialog(true)}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
            >
              Archive
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Delete Project</p>
              <p className="text-sm text-slate-500">Permanently delete this project and all its data. This cannot be undone.</p>
            </div>
            <button
              onClick={() => { setShowDeleteDialog(true); setDeleteConfirmText(''); }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Archive Confirmation Dialog */}
      {showArchiveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Archive Project?</h3>
            <p className="text-slate-600 mb-6">
              This project will be hidden from active lists. Components and data are preserved and can be restored later.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowArchiveDialog(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleArchive()
                  setShowArchiveDialog(false)
                }}
                disabled={archiveProject.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-slate-300"
              >
                {archiveProject.isPending ? 'Archiving...' : 'Archive Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-red-600 mb-2">Delete Project Permanently?</h3>
            <p className="text-slate-600 mb-4">
              This will permanently delete <strong>{project?.name}</strong> and all its data including drawings, components, BOM items, and progress history. This action cannot be undone.
            </p>
            <p className="text-sm text-slate-600 mb-2">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-6"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete()
                  setShowDeleteDialog(false)
                }}
                disabled={deleteConfirmText !== 'DELETE' || deleteProject.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {deleteProject.isPending ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  )
}
