/**
 * TypeScript Contracts: Avatar Storage Operations
 *
 * Feature: 017-user-profile-management
 * Purpose: Type-safe interfaces for Supabase Storage avatar operations
 */

// ============================================================================
// Storage Configuration
// ============================================================================

/**
 * Avatar storage bucket configuration
 */
export const AVATAR_STORAGE_CONFIG = {
  /** Supabase Storage bucket name */
  BUCKET_NAME: 'avatars',

  /** Maximum file size in bytes (2MB) */
  MAX_FILE_SIZE: 2 * 1024 * 1024,  // 2,097,152 bytes

  /** Allowed MIME types */
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp'
  ] as const,

  /** Allowed file extensions */
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp'] as const,

  /** Cache control header (1 hour) */
  CACHE_CONTROL: '3600',

  /** File path pattern */
  getFilePath: (userId: string, extension: string) => `${userId}/avatar.${extension}`
} as const

/**
 * Allowed avatar file extensions
 */
export type AvatarExtension = typeof AVATAR_STORAGE_CONFIG.ALLOWED_EXTENSIONS[number]

/**
 * Allowed avatar MIME types
 */
export type AvatarMimeType = typeof AVATAR_STORAGE_CONFIG.ALLOWED_MIME_TYPES[number]

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of avatar file validation
 */
export interface AvatarFileValidation {
  /** Validation passed */
  valid: boolean

  /** Error message if invalid */
  error?: string
}

/**
 * File metadata extracted from File object
 */
export interface AvatarFileMetadata {
  /** File name (original) */
  name: string

  /** File size in bytes */
  size: number

  /** MIME type */
  type: string

  /** File extension (extracted from name) */
  extension: string

  /** Last modified timestamp */
  lastModified: number
}

// ============================================================================
// Upload Types
// ============================================================================

/**
 * Avatar upload request
 */
export interface AvatarUploadRequest {
  /** User ID (for file path and database update) */
  userId: string

  /** File to upload */
  file: File
}

/**
 * Avatar upload response (success)
 */
export interface AvatarUploadResponse {
  /** Public URL to uploaded avatar */
  publicUrl: string

  /** File path in storage */
  filePath: string

  /** Upload timestamp */
  uploadedAt: string  // ISO 8601 datetime
}

/**
 * Avatar upload progress
 */
export interface AvatarUploadProgress {
  /** Bytes uploaded */
  loaded: number

  /** Total bytes */
  total: number

  /** Progress percentage (0-100) */
  percentage: number

  /** Upload speed (bytes per second, estimated) */
  speed?: number

  /** Estimated time remaining (seconds) */
  timeRemaining?: number
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useUpdateAvatar hook
 * Uses TanStack Query's useMutation return type
 */
export interface UseUpdateAvatarResult {
  /** Mutation function to upload avatar */
  mutate: (file: File) => void

  /** Async mutation function (returns promise) */
  mutateAsync: (file: File) => Promise<AvatarUploadResponse>

  /** Upload loading state */
  isPending: boolean

  /** Upload success state */
  isSuccess: boolean

  /** Upload error state */
  isError: boolean

  /** Upload error */
  error: Error | null

  /** Upload progress (if available) */
  progress: AvatarUploadProgress | null

  /** Reset mutation state */
  reset: () => void
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Extract metadata from File object
 */
export function getFileMetadata(file: File): AvatarFileMetadata {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    extension,
    lastModified: file.lastModified
  }
}

/**
 * Validate avatar file before upload
 */
export function validateAvatarFile(file: File): AvatarFileValidation {
  const metadata = getFileMetadata(file)

  // Check file type
  if (!AVATAR_STORAGE_CONFIG.ALLOWED_MIME_TYPES.includes(metadata.type as AvatarMimeType)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPG, PNG, or WebP.'
    }
  }

  // Check file size
  if (metadata.size > AVATAR_STORAGE_CONFIG.MAX_FILE_SIZE) {
    const maxSizeMB = AVATAR_STORAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB.`
    }
  }

  // Check file extension (additional validation)
  if (!AVATAR_STORAGE_CONFIG.ALLOWED_EXTENSIONS.includes(metadata.extension as AvatarExtension)) {
    return {
      valid: false,
      error: 'Invalid file extension. Please use .jpg, .jpeg, .png, or .webp.'
    }
  }

  return { valid: true }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Calculate upload progress percentage
 */
export function calculateProgress(loaded: number, total: number): number {
  if (total === 0) return 0
  return Math.round((loaded / total) * 100)
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Avatar upload error codes
 */
export enum AvatarUploadErrorCode {
  /** File validation failed */
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  /** Storage upload failed */
  UPLOAD_ERROR = 'UPLOAD_ERROR',

  /** Database update failed */
  DATABASE_ERROR = 'DATABASE_ERROR',

  /** Network error */
  NETWORK_ERROR = 'NETWORK_ERROR',

  /** Storage quota exceeded */
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  /** RLS policy violation */
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  /** Unknown error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Avatar upload error (custom error class)
 */
export class AvatarUploadError extends Error {
  /** Error code */
  code: AvatarUploadErrorCode

  /** Original error (if any) */
  originalError?: Error

  constructor(
    code: AvatarUploadErrorCode,
    message: string,
    originalError?: Error
  ) {
    super(message)
    this.name = 'AvatarUploadError'
    this.code = code
    this.originalError = originalError
  }
}

/**
 * Create user-friendly error message from error code
 */
export function getErrorMessage(code: AvatarUploadErrorCode): string {
  switch (code) {
    case AvatarUploadErrorCode.VALIDATION_ERROR:
      return 'Invalid file. Please check file type and size.'
    case AvatarUploadErrorCode.UPLOAD_ERROR:
      return 'Failed to upload avatar. Please try again.'
    case AvatarUploadErrorCode.DATABASE_ERROR:
      return 'Failed to save avatar URL. Please try again.'
    case AvatarUploadErrorCode.NETWORK_ERROR:
      return 'Network error. Please check your connection and try again.'
    case AvatarUploadErrorCode.QUOTA_EXCEEDED:
      return 'Storage limit reached. Please contact your organization administrator.'
    case AvatarUploadErrorCode.PERMISSION_DENIED:
      return 'Permission denied. Unable to upload avatar.'
    case AvatarUploadErrorCode.UNKNOWN_ERROR:
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for AvatarUpload component (if extracted)
 */
export interface AvatarUploadProps {
  /** Current avatar URL (or null) */
  currentAvatarUrl: string | null

  /** User's email (for fallback initial) */
  userEmail: string

  /** Callback when upload completes successfully */
  onUploadSuccess: (publicUrl: string) => void

  /** Callback when upload fails */
  onUploadError: (error: AvatarUploadError) => void

  /** Upload in progress */
  isUploading?: boolean

  /** Upload progress (0-100) */
  uploadProgress?: number

  /** Size of avatar display (in pixels) */
  size?: number

  /** Show upload button on hover */
  showUploadButton?: boolean
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Avatar display size presets
 */
export const AVATAR_SIZES = {
  /** Small avatar (navigation bar, lists) */
  SMALL: 32,

  /** Medium avatar (dropdowns, cards) */
  MEDIUM: 48,

  /** Large avatar (profile modal header) */
  LARGE: 128,

  /** Extra large avatar (profile pages) */
  XLARGE: 256
} as const

/**
 * Avatar display size type
 */
export type AvatarSize = typeof AVATAR_SIZES[keyof typeof AVATAR_SIZES]

// ============================================================================
// Example Usage (Documentation)
// ============================================================================

/**
 * Example: Validating and uploading an avatar
 *
 * ```typescript
 * import { validateAvatarFile, AvatarUploadErrorCode } from './contracts/avatar-storage.types'
 * import { useUpdateAvatar } from '@/hooks/useUpdateAvatar'
 *
 * function AvatarUploader() {
 *   const { mutate, isPending, error } = useUpdateAvatar()
 *
 *   const handleFileSelect = (file: File) => {
 *     // Validate before upload
 *     const validation = validateAvatarFile(file)
 *     if (!validation.valid) {
 *       toast.error(validation.error)
 *       return
 *     }
 *
 *     // Upload if valid
 *     mutate(file)
 *   }
 *
 *   return (
 *     <div>
 *       <input
 *         type="file"
 *         accept="image/jpeg,image/png,image/webp"
 *         onChange={(e) => {
 *           const file = e.target.files?.[0]
 *           if (file) handleFileSelect(file)
 *         }}
 *       />
 *       {isPending && <p>Uploading...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   )
 * }
 * ```
 */

/**
 * Example: Displaying avatar with fallback
 *
 * ```typescript
 * import { AVATAR_SIZES } from './contracts/avatar-storage.types'
 *
 * function Avatar({ url, email, size = AVATAR_SIZES.MEDIUM }: {
 *   url: string | null
 *   email: string
 *   size?: number
 * }) {
 *   const initial = email.charAt(0).toUpperCase()
 *
 *   if (url) {
 *     return (
 *       <img
 *         src={url}
 *         alt="Avatar"
 *         className="rounded-full object-cover"
 *         style={{ width: size, height: size }}
 *       />
 *     )
 *   }
 *
 *   // Fallback to initial letter
 *   return (
 *     <div
 *       className="rounded-full bg-slate-600 flex items-center justify-center text-white font-semibold"
 *       style={{ width: size, height: size, fontSize: size / 2 }}
 *     >
 *       {initial}
 *     </div>
 *   )
 * }
 * ```
 */
