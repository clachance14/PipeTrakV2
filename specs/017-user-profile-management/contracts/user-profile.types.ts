/**
 * TypeScript Contracts: User Profile Data
 *
 * Feature: 017-user-profile-management
 * Purpose: Type-safe interfaces for user profile operations
 *
 * Note: These are DESIGN contracts showing intended types.
 * Actual implementation will use Supabase-generated types from database schema.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * User Profile (complete user record with organization)
 * Returned by useUserProfile hook
 */
export interface UserProfile {
  /** User ID (UUID from auth.users) */
  id: string

  /** Email address (read-only, managed by Supabase Auth) */
  email: string

  /** User's display name (editable) */
  full_name: string | null

  /** Organization ID (read-only, managed by org admins) */
  organization_id: string | null

  /** User role in organization (read-only, managed by org admins) */
  role: UserRole | null

  /** Public URL to avatar image in Supabase Storage (editable via upload) */
  avatar_url: string | null

  /** Account creation timestamp */
  created_at: string  // ISO 8601 datetime

  /** Last profile update timestamp */
  updated_at: string  // ISO 8601 datetime

  /** Soft delete timestamp (null if active) */
  deleted_at: string | null  // ISO 8601 datetime

  /** Joined organization data (from users.select with organization join) */
  organization: Organization | null
}

/**
 * Organization data (joined from organizations table)
 */
export interface Organization {
  /** Organization ID */
  id: string

  /** Organization name (displayed in profile) */
  name: string
}

/**
 * User roles in PipeTrak V2
 * Must match database CHECK constraint in users.role column
 */
export type UserRole =
  | 'owner'
  | 'admin'
  | 'project_manager'
  | 'foreman'
  | 'qc_inspector'
  | 'welder'
  | 'viewer'

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useUserProfile hook
 * Uses TanStack Query's useQuery return type
 */
export interface UseUserProfileResult {
  /** User profile data (undefined while loading) */
  data: UserProfile | undefined

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: Error | null

  /** Refetch function (manual refresh) */
  refetch: () => Promise<void>
}

/**
 * Return type for useUpdateProfile hook
 * Uses TanStack Query's useMutation return type
 */
export interface UseUpdateProfileResult {
  /** Mutation function to update profile */
  mutate: (fullName: string) => void

  /** Async mutation function (returns promise) */
  mutateAsync: (fullName: string) => Promise<UserProfile>

  /** Mutation loading state */
  isPending: boolean

  /** Mutation success state */
  isSuccess: boolean

  /** Mutation error state */
  isError: boolean

  /** Mutation error */
  error: Error | null

  /** Reset mutation state */
  reset: () => void
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Request payload for updating user profile (full_name)
 */
export interface UpdateProfileRequest {
  /** User ID (for database update WHERE clause) */
  userId: string

  /** New full name (trimmed, 1-100 characters) */
  fullName: string
}

/**
 * Response from profile update operation
 */
export interface UpdateProfileResponse {
  /** Updated user profile */
  user: UserProfile

  /** Success message */
  message: string
}

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for UserMenu component
 */
export interface UserMenuProps {
  /** No props - reads user from AuthContext */
}

/**
 * Props for UserProfileModal component
 */
export interface UserProfileModalProps {
  /** Controlled open state */
  open: boolean

  /** Callback to change open state (close modal) */
  onOpenChange: (open: boolean) => void
}

/**
 * Props for ProfileHeader component
 */
export interface ProfileHeaderProps {
  /** Current user profile data */
  user: UserProfile

  /** Callback to update full name */
  onNameUpdate: (fullName: string) => void

  /** Callback to upload avatar */
  onAvatarUpdate: (file: File) => void

  /** Name update in progress */
  isUpdatingName?: boolean

  /** Avatar upload in progress */
  isUploadingAvatar?: boolean
}

/**
 * Props for ProfileInfoSection component
 */
export interface ProfileInfoSectionProps {
  /** User email address */
  email: string

  /** Organization name or null */
  organizationName: string | null

  /** User role or null */
  role: UserRole | null
}

/**
 * Props for PasswordChangeForm component
 */
export interface PasswordChangeFormProps {
  /** No props - uses AuthContext for user */
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of full name validation
 */
export interface FullNameValidation {
  /** Validation passed */
  valid: boolean

  /** Error message if invalid */
  error?: string
}

/**
 * Validation rules for full name
 */
export const FULL_NAME_VALIDATION = {
  /** Minimum length (after trim) */
  MIN_LENGTH: 1,

  /** Maximum length */
  MAX_LENGTH: 100,

  /** Validation function */
  validate: (name: string): FullNameValidation => {
    const trimmed = name.trim()

    if (trimmed.length === 0) {
      return { valid: false, error: 'Name cannot be empty' }
    }

    if (trimmed.length > FULL_NAME_VALIDATION.MAX_LENGTH) {
      return { valid: false, error: `Name must be ${FULL_NAME_VALIDATION.MAX_LENGTH} characters or less` }
    }

    return { valid: true }
  }
} as const

// ============================================================================
// Utility Functions (Type Guards)
// ============================================================================

/**
 * Type guard to check if user has an organization
 */
export function hasOrganization(user: UserProfile): user is UserProfile & { organization: Organization } {
  return user.organization !== null && user.organization_id !== null
}

/**
 * Type guard to check if user has a role
 */
export function hasRole(user: UserProfile): user is UserProfile & { role: UserRole } {
  return user.role !== null
}

/**
 * Type guard to check if user has an avatar
 */
export function hasAvatar(user: UserProfile): user is UserProfile & { avatar_url: string } {
  return user.avatar_url !== null && user.avatar_url.length > 0
}

/**
 * Format role for display (e.g., "project_manager" → "Project Manager")
 */
export function formatRole(role: UserRole): string {
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// ============================================================================
// Example Usage (Documentation)
// ============================================================================

/**
 * Example: Using useUserProfile hook in a component
 *
 * ```typescript
 * import { useUserProfile } from '@/hooks/useUserProfile'
 * import type { UserProfile } from './contracts/user-profile.types'
 *
 * function ProfileDisplay() {
 *   const { data: profile, isLoading, error } = useUserProfile()
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *   if (!profile) return <div>No profile found</div>
 *
 *   return (
 *     <div>
 *       <h1>{profile.full_name || 'Anonymous'}</h1>
 *       <p>{profile.email}</p>
 *       {hasOrganization(profile) && (
 *         <p>Organization: {profile.organization.name}</p>
 *       )}
 *       {hasRole(profile) && (
 *         <p>Role: {formatRole(profile.role)}</p>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */

/**
 * Example: Using useUpdateProfile hook
 *
 * ```typescript
 * import { useUpdateProfile } from '@/hooks/useUpdateProfile'
 *
 * function NameEditor({ currentName }: { currentName: string }) {
 *   const [name, setName] = useState(currentName)
 *   const { mutate, isPending, isError, error } = useUpdateProfile()
 *
 *   const handleSave = () => {
 *     const validation = FULL_NAME_VALIDATION.validate(name)
 *     if (!validation.valid) {
 *       toast.error(validation.error)
 *       return
 *     }
 *     mutate(name)
 *   }
 *
 *   return (
 *     <div>
 *       <input value={name} onChange={(e) => setName(e.target.value)} />
 *       <button onClick={handleSave} disabled={isPending}>
 *         {isPending ? 'Saving...' : 'Save'}
 *       </button>
 *       {isError && <p>Error: {error?.message}</p>}
 *     </div>
 *   )
 * }
 * ```
 */
