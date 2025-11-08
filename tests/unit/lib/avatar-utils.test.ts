import { describe, it, expect } from 'vitest'
import { validateAvatarFile, getFileMetadata, formatFileSize, AVATAR_CONFIG } from '@/lib/avatar-utils'

describe('avatar-utils', () => {
  describe('validateAvatarFile', () => {
    it('accepts valid JPEG file', () => {
      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
      const result = validateAvatarFile(file)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('accepts valid PNG file', () => {
      const file = new File(['content'], 'avatar.png', { type: 'image/png' })
      const result = validateAvatarFile(file)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('accepts valid WebP file', () => {
      const file = new File(['content'], 'avatar.webp', { type: 'image/webp' })
      const result = validateAvatarFile(file)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('rejects invalid file type', () => {
      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' })
      const result = validateAvatarFile(file)
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid file type')
    })

    it('rejects file larger than 2MB', () => {
      // Create a file larger than 2MB
      const largeContent = new Array(3 * 1024 * 1024).fill('a').join('')
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })
      const result = validateAvatarFile(file)
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('File too large')
      expect(result.error).toContain('2MB')
    })

    it('rejects file with invalid extension', () => {
      const file = new File(['content'], 'avatar.gif', { type: 'image/jpeg' })
      const result = validateAvatarFile(file)
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid file extension')
    })

    it('accepts file exactly at size limit', () => {
      const content = new Array(AVATAR_CONFIG.MAX_FILE_SIZE).fill('a').join('')
      const file = new File([content], 'avatar.jpg', { type: 'image/jpeg' })
      const result = validateAvatarFile(file)
      
      expect(result.valid).toBe(true)
    })
  })

  describe('getFileMetadata', () => {
    it('extracts file metadata correctly', () => {
      const file = new File(['content'], 'avatar.png', { 
        type: 'image/png',
        lastModified: 1234567890
      })
      
      const metadata = getFileMetadata(file)
      
      expect(metadata.name).toBe('avatar.png')
      expect(metadata.type).toBe('image/png')
      expect(metadata.extension).toBe('png')
      expect(metadata.lastModified).toBe(1234567890)
    })

    it('handles file without extension', () => {
      const file = new File(['content'], 'avatar', { type: 'image/png' })
      const metadata = getFileMetadata(file)

      // When there's no extension, the filename itself is returned by split().pop()
      expect(metadata.extension).toBe('avatar')
    })

    it('extracts lowercase extension', () => {
      const file = new File(['content'], 'AVATAR.JPG', { type: 'image/jpeg' })
      const metadata = getFileMetadata(file)
      
      expect(metadata.extension).toBe('jpg')
    })
  })

  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(500)).toBe('500 Bytes')
    })

    it('formats kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('formats megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
    })

    it('formats gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })
  })
})
