/**
 * Avatar Validation Utilities
 * Feature: 017-user-profile-management
 * Purpose: Client-side validation for avatar file uploads
 */

// Avatar storage configuration
export const AVATAR_CONFIG = {
  /** Maximum file size in bytes (2MB) */
  MAX_FILE_SIZE: 2 * 1024 * 1024,

  /** Allowed MIME types */
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,

  /** Allowed file extensions */
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp'] as const,
} as const

export type AvatarMimeType = typeof AVATAR_CONFIG.ALLOWED_MIME_TYPES[number]
export type AvatarExtension = typeof AVATAR_CONFIG.ALLOWED_EXTENSIONS[number]

/**
 * File metadata extracted from File object
 */
export interface AvatarFileMetadata {
  name: string
  size: number
  type: string
  extension: string
  lastModified: number
}

/**
 * Result of avatar file validation
 */
export interface AvatarFileValidation {
  valid: boolean
  error?: string
}

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
    lastModified: file.lastModified,
  }
}

/**
 * Validate avatar file before upload
 */
export function validateAvatarFile(file: File): AvatarFileValidation {
  const metadata = getFileMetadata(file)

  // Check file type
  if (!AVATAR_CONFIG.ALLOWED_MIME_TYPES.includes(metadata.type as AvatarMimeType)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPG, PNG, or WebP.',
    }
  }

  // Check file size
  if (metadata.size > AVATAR_CONFIG.MAX_FILE_SIZE) {
    const maxSizeMB = AVATAR_CONFIG.MAX_FILE_SIZE / (1024 * 1024)
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB.`,
    }
  }

  // Check file extension (additional validation)
  if (!AVATAR_CONFIG.ALLOWED_EXTENSIONS.includes(metadata.extension as AvatarExtension)) {
    return {
      valid: false,
      error: 'Invalid file extension. Please use .jpg, .jpeg, .png, or .webp.',
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

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
