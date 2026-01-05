/**
 * OrganizationSettingsPage Component
 * Feature: Company Logo Support
 *
 * Settings page for managing organization-wide settings.
 * Located at: /settings/organization
 *
 * Features:
 * - Upload/replace company logo (JPEG, PNG, WebP, max 2MB)
 * - Preview logo before upload
 * - Remove logo
 * - Permission-gated (requires canManageTeam - owner/admin only)
 */

import { useState, useRef, useEffect, ChangeEvent } from 'react'
import { Upload, Trash2, Building2, X, Check } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { useOrganization } from '@/hooks/useOrganization'
import { useUpdateOrganizationLogo } from '@/hooks/useUpdateOrganizationLogo'
import { useDeleteOrganizationLogo } from '@/hooks/useDeleteOrganizationLogo'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function OrganizationSettingsPage() {
  const { canManageTeam } = usePermissions()
  const { useCurrentOrganization } = useOrganization()
  const { data: orgData, isLoading } = useCurrentOrganization()
  const uploadMutation = useUpdateOrganizationLogo()
  const deleteMutation = useDeleteOrganizationLogo()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Cleanup object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // Permission check
  if (!canManageTeam) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600">Only owners and admins can access organization settings.</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-[800px] mx-auto p-6 md:p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-48 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-64 mb-8" />
            <div className="h-40 bg-slate-200 rounded" />
          </div>
        </div>
      </Layout>
    )
  }

  const currentLogoUrl = orgData?.organization.logo_url
  const organizationName = orgData?.organization.name || 'Organization'

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please select a JPEG, PNG, or WebP image')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be less than 2MB')
      return
    }

    // Create preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !orgData?.organization.id) return

    try {
      await uploadMutation.mutateAsync({
        organizationId: orgData.organization.id,
        file: selectedFile,
      })
      toast.success('Logo uploaded successfully')
      clearPreview()
    } catch {
      toast.error('Failed to upload logo')
    }
  }

  const handleDelete = async () => {
    if (!orgData?.organization.id) return

    try {
      await deleteMutation.mutateAsync({
        organizationId: orgData.organization.id,
      })
      toast.success('Logo removed')
      setShowDeleteDialog(false)
    } catch {
      toast.error('Failed to remove logo')
    }
  }

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <Layout>
      <div className="max-w-[800px] mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Organization Settings</h1>
          <p className="text-slate-600">Manage settings for {organizationName}</p>
        </div>

        {/* Logo Section */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Company Logo</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your logo will appear in the app header and on PDF reports. Recommended size: 200x100 pixels or larger.
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Current Logo / Preview */}
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : currentLogoUrl ? (
                  <img
                    src={currentLogoUrl}
                    alt="Current logo"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <Building2 className="w-12 h-12 text-slate-400" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {previewUrl ? 'Preview' : currentLogoUrl ? 'Current logo' : 'No logo set'}
              </p>
            </div>

            {/* Upload Controls */}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              {previewUrl ? (
                // Preview mode: confirm or cancel
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Preview looks good? Click confirm to upload.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleUpload}
                      disabled={uploadMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" />
                      {uploadMutation.isPending ? 'Uploading...' : 'Confirm Upload'}
                    </button>
                    <button
                      onClick={clearPreview}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Normal mode: select file
                <div className="space-y-4">
                  <button
                    onClick={triggerFileSelect}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Upload className="w-4 h-4" />
                    {currentLogoUrl ? 'Change Logo' : 'Upload Logo'}
                  </button>

                  {currentLogoUrl && (
                    <button
                      onClick={() => setShowDeleteDialog(true)}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove Logo
                    </button>
                  )}

                  <p className="text-xs text-slate-500">
                    Accepted formats: JPEG, PNG, WebP. Maximum size: 2MB.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Remove Logo?</h3>
              <p className="text-slate-600 mb-6">
                This will remove your company logo from the app header and PDF reports.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-slate-300"
                >
                  {deleteMutation.isPending ? 'Removing...' : 'Remove Logo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
