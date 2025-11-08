import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from './Avatar'
import { UserProfileModal } from './UserProfileModal'
import { ProfileHeader } from './ProfileHeader'
import { ProfileInfoSection } from './ProfileInfoSection'
import { PasswordChangeForm } from './PasswordChangeForm'
import { useUserProfile } from '@/hooks/useUserProfile'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const { data: profileData, isLoading } = useUserProfile(user?.id || '')

  if (!user) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="User menu"
            className="focus:outline-none focus:ring-2 focus:ring-slate-400 rounded-full"
          >
            <Avatar
              url={profileData?.avatar_url || null}
              email={user.email || ''}
              size={40}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut}>
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserProfileModal open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        {isLoading ? (
          <div className="text-center py-4">Loading...</div>
        ) : profileData ? (
          <div className="space-y-6">
            <ProfileHeader
              user={{
                id: profileData.id,
                email: profileData.email,
                full_name: profileData.full_name,
                avatar_url: profileData.avatar_url
              }}
            />
            <ProfileInfoSection
              email={profileData.email}
              organizationName={profileData.organization?.name || null}
              role={profileData.role}
            />
            <PasswordChangeForm />
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500">
            Unable to load profile data
          </div>
        )}
      </UserProfileModal>
    </>
  )
}
