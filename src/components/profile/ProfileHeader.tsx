import { useState } from 'react'
import { Avatar } from './Avatar'
import { useUpdateProfile } from '@/hooks/useUpdateProfile'

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

  const { mutate, isPending } = useUpdateProfile()

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

  return (
    <div className="flex items-center space-x-4 mb-6">
      {/* Avatar */}
      <Avatar url={user.avatar_url} email={user.email} size={80} />

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
  )
}
