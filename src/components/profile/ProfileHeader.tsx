import { useState, useRef, useEffect } from 'react'
import { Avatar } from './Avatar'
import { useUpdateProfile } from '@/hooks/useUpdateProfile'
import { useUpdateAvatar } from '@/hooks/useUpdateAvatar'
import { validateAvatarFile } from '@/lib/avatar-utils'
import { toast } from 'sonner'

interface ProfileHeaderProps {
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState(user.full_name || '')
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { mutate, isPending } = useUpdateProfile()
  const avatarMutation = useUpdateAvatar()

  // Handle avatar upload success/error with toasts
  useEffect(() => {
    if (avatarMutation.isSuccess) {
      setUploadError(null)
      toast.success('Avatar updated successfully')
    } else if (avatarMutation.isError) {
      const errorMessage = `Failed to upload avatar: ${avatarMutation.error?.message || 'Unknown error'}`
      setUploadError(errorMessage)
      toast.error(errorMessage)
    }
  }, [avatarMutation.isSuccess, avatarMutation.isError, avatarMutation.error])

  const handleEdit = () => {
    setIsEditing(true)
    setFullName(user.full_name || '')
    setError(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFullName(user.full_name || '')
    setError(null)
  }

  const handleSave = () => {
    const trimmedName = fullName.trim()

    // Validation
    if (!trimmedName) {
      setError('Name cannot be empty')
      return
    }

    if (trimmedName.length > 100) {
      setError('Name must be 100 characters or less')
      return
    }

    // Call mutation
    mutate(
      { userId: user.id, fullName: trimmedName },
      {
        onSuccess: () => {
          setIsEditing(false)
          setError(null)
        }
      }
    )
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Clear previous upload error
    setUploadError(null)

    // Validate file
    const validation = validateAvatarFile(file)
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file')
      return
    }

    // Upload file
    avatarMutation.mutate({ userId: user.id, file })

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-4">
        {/* Avatar with Upload */}
        <div
          className="relative cursor-pointer"
          onMouseEnter={() => setIsHoveringAvatar(true)}
          onMouseLeave={() => setIsHoveringAvatar(false)}
          onClick={handleAvatarClick}
        >
        <Avatar url={user.avatar_url} email={user.email} size={80} />

        {/* Hover Overlay or Upload State */}
        {(isHoveringAvatar || avatarMutation.isPending) && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {avatarMutation.isPending ? 'Uploading...' : 'Upload Photo'}
            </span>
          </div>
        )}

        {/* Progress Indicator for Large Files */}
        {avatarMutation.isPending && (
          <div className="absolute -bottom-2 left-0 right-0">
            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-slate-700 animate-pulse w-full"></div>
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload profile photo"
          disabled={avatarMutation.isPending}
        />
      </div>

      {/* Name Section */}
      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Enter your full name"
              aria-label="Full name"
              disabled={isPending}
            />
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
                aria-label="Save"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                aria-label="Cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold text-slate-900">
              {user.full_name || 'Add your name'}
            </h2>
            <button
              onClick={handleEdit}
              className="text-sm text-slate-600 hover:text-slate-900"
              aria-label="Edit name"
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Upload Error Message */}
    {uploadError && (
      <p className="text-sm text-red-600" role="alert">
        {uploadError}
      </p>
    )}
    </div>
  )
}
